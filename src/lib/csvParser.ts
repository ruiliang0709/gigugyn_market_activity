import type { MarketEvent, TumorType, EventScale } from '@/types';
import { TUMOR_TYPES, TA_MAP, getScaleFromAttendees } from '@/types';

/**
 * Auto-detect delimiter: try tab first, then comma, then semicolon
 */
function detectDelimiter(firstLine: string): string {
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount >= 3) return '\t';
  if (commaCount >= 2) return ',';
  if (semiCount >= 2) return ';';
  return ','; // default
}

/**
 * Parse a line with given delimiter, handling quotes
 */
function parseLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parse user's CSV/TSV format
 */
export function parseUserCSV(content: string): { events: MarketEvent[]; errors: string[] } {
  const errors: string[] = [];

  // Split into lines
  const lines = content.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    errors.push('文件至少需要包含表头和一行数据');
    return { events: [], errors };
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0]);

  // Parse header
  const rawHeaders = parseLine(lines[0], delimiter);

  // Build column mapping
  const colMap = buildColumnMap(rawHeaders);

  // Debug: if no key columns found, try standard format
  const hasActivityName = colMap.get('activityName') !== undefined;
  const hasDate = colMap.get('month') !== undefined || colMap.get('fullDate') !== undefined ||
                  colMap.get('date') !== undefined || colMap.get('day') !== undefined;

  if (!hasActivityName || !hasDate) {
    // Try standard CSV format (title, date, etc.)
    return parseStandardCSV(lines, rawHeaders, delimiter);
  }

  const events: MarketEvent[] = [];

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const values = parseLine(lines[rowIdx], delimiter);
    const get = (key: string): string => {
      const idx = colMap.get(key);
      if (idx === undefined || idx >= values.length) return '';
      return values[idx].trim();
    };

    try {
      // Title
      const title = get('activityName');
      if (!title) {
        errors.push(`第 ${rowIdx + 1} 行: 活动名称为空`);
        continue;
      }

      // Date parsing - try multiple strategies
      let dateStr = '';

      // Strategy 1: direct full date column (including empty-header column)
      const fullDateIdx = colMap.get('fullDate');
      if (fullDateIdx !== undefined && fullDateIdx < values.length) {
        const val = values[fullDateIdx].trim();
        if (val && !isTBD(val) && looksLikeDate(val)) {
          dateStr = normalizeDate(val);
        }
      }

      // Strategy 2: month + day columns (skip if TBD)
      if (!dateStr) {
        const monthStr = get('month');
        const dayStr = get('day');
        if (isTBD(dayStr) || isTBD(monthStr)) {
          errors.push(`第 ${rowIdx + 1} 行: "${title}" 日期待定(TBD)，已跳过`);
          continue;
        }
        if (monthStr && dayStr) {
          const year = detectYear(values) || new Date().getFullYear();
          const m = parseInt(monthStr) || 1;
          const d = parseInt(dayStr) || 1;
          dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }

      // Strategy 3: any column that looks like a full date
      if (!dateStr) {
        for (let i = 0; i < values.length && i < rawHeaders.length; i++) {
          const val = values[i].trim();
          if (val && !isTBD(val) && looksLikeDate(val)) {
            const norm = normalizeDate(val);
            if (norm) {
              dateStr = norm;
              break;
            }
          }
        }
      }

      // Strategy 4: standard date column
      if (!dateStr) {
        const dateVal = get('date');
        if (dateVal) dateStr = normalizeDate(dateVal);
      }

      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.push(`第 ${rowIdx + 1} 行: 无法解析日期，原始数据: "${values.slice(Math.max(0, colMap.get('month') || 0), Math.min(values.length, (colMap.get('day') || 0) + 2)).join(', ')}"`);
        continue;
      }

      // TA → tumorType
      let tumorType: TumorType = '食管癌';
      const taCode = get('ta');
      if (taCode) {
        const mapped = TA_MAP[taCode.toUpperCase()];
        if (mapped) tumorType = mapped;
        else if (TUMOR_TYPES.includes(taCode as TumorType)) tumorType = taCode as TumorType;
        else {
          const match = Object.entries(TA_MAP).find(([k]) =>
            taCode.toUpperCase().includes(k) || k.includes(taCode.toUpperCase())
          );
          if (match) tumorType = match[1];
        }
      }

      // Location
      const province = get('province');
      const city = get('city');
      const hospital = get('hospital');
      const locationParts = [province, city, hospital].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(' · ') : '待定';

      // Activity type - keep original value from user's data
      let type = get('activityType') || '其他';

      // Attendees
      let attendees = 0;
      const attStr = get('attendees');
      if (attStr) attendees = parseInt(attStr.replace(/,/g, '')) || 0;

      // Scale
      const scale: EventScale = getScaleFromAttendees(attendees);

      // KOL/Speakers
      const kolStr = get('kol');
      const speakers = kolStr
        ? kolStr.split(/[,，、|等]/).map((s) => s.trim()).filter(Boolean)
        : [];

      // Budget
      let budget = 0;
      const budgetStr = get('budget');
      if (budgetStr) budget = parseInt(budgetStr.replace(/,/g, '')) || 0;

      // Online/offline
      const ooStr = get('onlineOffline');
      let onlineOffline: MarketEvent['onlineOffline'] = undefined;
      if (ooStr === 'Online') onlineOffline = 'Online';
      else if (ooStr === 'Offline') onlineOffline = 'Offline';
      else if (ooStr === 'Combine') onlineOffline = 'Combine';

      // Description (学术策略)
      const description = get('strategy') || '';

      events.push({
        id: `imported-${Date.now()}-${rowIdx}`,
        title,
        date: dateStr,
        tumorType,
        location,
        scale,
        type,
        description,
        speakers: speakers.length > 0 ? speakers : undefined,
        attendees: attendees > 0 ? attendees : undefined,
        budget: budget > 0 ? budget : undefined,
        onlineOffline,
        ta: taCode || undefined,
        expCategory: get('expCategory') || undefined,
        region: get('region') || get('directorRegion') || undefined,
        province: province || undefined,
        city: city || undefined,
        hospital: hospital || undefined,
        kol: kolStr || undefined,
      });
    } catch (err: any) {
      errors.push(`第 ${rowIdx + 1} 行: 解析错误 - ${err.message}`);
    }
  }

  return { events, errors };
}

/**
 * Build column mapping from headers - uses exact match and aliases
 */
function buildColumnMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();

  // Try exact match first
  const exactMatches: Record<string, string[]> = {
    activityName: ['活动名称'],
    month: ['月份'],
    day: ['日期'],
    fullDate: ['日期(完整)', '完整日期', ' fulldate'],
    year: ['年'],
    ta: ['TA'],
    strategy: ['学术策略'],
    province: ['省份'],
    city: ['城市'],
    activityType: ['活动类型'],
    expCategory: ['Exp Category'],
    onlineOffline: ['On/Offline/Combine'],
    hospital: ['医院'],
    kol: ['KOL'],
    attendees: ['覆盖客户数'],
    budget: ['金额'],
    region: ['大区'],
    directorRegion: ['总监区域'],
    seq: ['序号'],
    central: ['中央'],
  };

  // First pass: exact matches
  for (const [key, names] of Object.entries(exactMatches)) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].trim();
      if (names.includes(h)) {
        map.set(key, i);
        break;
      }
    }
  }

  // Second pass: check for empty headers that might be date columns
  // If "日期" header is found and the next header is empty or "省份"/"城市",
  // the empty column between "日期" and "省份"/"城市" likely contains full date
  const dateIdx = map.get('day');
  if (dateIdx !== undefined) {
    // Check the next 1-2 columns
    for (let offset = 1; offset <= 3; offset++) {
      const checkIdx = dateIdx + offset;
      if (checkIdx < headers.length) {
        const h = headers[checkIdx].trim();
        // If this header is empty or contains date-related text
        if (h === '' || h === '日期') {
          map.set('fullDate', checkIdx);
          break;
        }
      }
    }
  }

  // Third pass: case-insensitive matching for remaining
  const caseInsensitive: Record<string, string[]> = {
    ta: ['ta', '治疗领域', 'therapeutic area', '适应症'],
    activityName: ['name', 'title', 'event name', '会议名称'],
    month: ['month'],
    day: ['day', '日'],
    year: ['year'],
    fullDate: ['date'],
    province: ['province', '省'],
    city: ['city', '市'],
    activityType: ['type', '会议类型'],
    expCategory: ['exp_category', 'category'],
    onlineOffline: ['on/offline', '形式'],
    hospital: ['hospital', '会议地点', 'venue', 'location', '地点'],
    kol: ['专家', '讲者', 'speaker', 'speakers'],
    attendees: ['客户数', '参会人数', '人数', 'attendees', 'attendee count', '覆盖人数'],
    budget: ['budget', '费用', 'expense', 'cost'],
    region: ['region', 'area', '区域'],
    strategy: ['strategy', '学术主题', '主题'],
    seq: ['编号', 'id', 'no'],
  };

  for (const [key, names] of Object.entries(caseInsensitive)) {
    if (map.has(key)) continue; // Already found
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase().trim();
      if (names.some((n) => h === n.toLowerCase())) {
        map.set(key, i);
        break;
      }
    }
  }

  return map;
}

/**
 * Check if a value indicates "date to be determined"
 */
function isTBD(str: string): boolean {
  if (!str) return true;
  const s = str.trim().toUpperCase();
  return s === 'TBD' || s === '待定' || s === '待订' || s === '待确认' || s === 'TBDTBD' || s === 'N/A' || s === '--' || s === '-';
}

/**
 * Check if a string looks like a date
 */
function looksLikeDate(str: string): boolean {
  if (isTBD(str)) return false;
  // Patterns: 2026/4/11, 2026-04-11, 2026.04.11, 4/11/2026, etc.
  return /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(str) ||
         /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(str) ||
         /^\d{4}年\d{1,2}月\d{1,2}日$/.test(str);
}

/**
 * Detect year from any value in the row
 */
function detectYear(values: string[]): number | null {
  for (const v of values) {
    if (/^20\d{2}$/.test(v.trim())) {
      return parseInt(v.trim());
    }
  }
  return null;
}

/**
 * Normalize date string to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr || isTBD(dateStr)) return '';

  // Chinese format: 2026年4月11日
  const chineseMatch = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (chineseMatch) {
    return `${chineseMatch[1]}-${String(parseInt(chineseMatch[2])).padStart(2, '0')}-${String(parseInt(chineseMatch[3])).padStart(2, '0')}`;
  }

  // Slash/dot format: 2026/4/11 or 2026.04.11
  const cleaned = dateStr.replace(/\./g, '/');
  const parts = cleaned.split('/').map((p) => parseInt(p.trim()));

  if (parts.length >= 3) {
    // Determine order: YYYY/MM/DD or MM/DD/YYYY
    let year: number, month: number, day: number;
    if (parts[0] > 2000) {
      year = parts[0]; month = parts[1]; day = parts[2];
    } else if (parts[2] > 2000) {
      month = parts[0]; day = parts[1]; year = parts[2];
    } else {
      year = parts[0]; month = parts[1]; day = parts[2];
    }
    if (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Dash format: 2026-04-11
  const dashParts = dateStr.split('-').map((p) => parseInt(p.trim()));
  if (dashParts.length >= 3 && dashParts[0] > 2000) {
    const year = dashParts[0];
    const month = dashParts[1];
    const day = dashParts[2];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Try Date.parse as fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return '';
}

/**
 * Parse standard simple CSV format
 */
function parseStandardCSV(lines: string[], headers: string[], delimiter: string): { events: MarketEvent[]; errors: string[] } {
  const errors: string[] = [];
  const events: MarketEvent[] = [];

  // Find title and date columns
  let titleIdx = -1;
  let dateIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (h === 'title' || h === '活动名称' || h === 'name') titleIdx = i;
    if (h === 'date' || h === '日期' || h === 'fulldate') dateIdx = i;
  }

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const values = parseLine(lines[rowIdx], delimiter);

    let title = '';
    let dateStr = '';

    if (titleIdx >= 0 && titleIdx < values.length) title = values[titleIdx].trim();
    if (dateIdx >= 0 && dateIdx < values.length) dateStr = normalizeDate(values[dateIdx].trim());

    // If no title/date found by index, try all values
    if (!title) {
      for (const v of values) {
        if (v.trim() && !looksLikeDate(v) && v.length > 2) {
          title = v.trim();
          break;
        }
      }
    }
    if (!dateStr) {
      for (const v of values) {
        const norm = normalizeDate(v.trim());
        if (norm) {
          dateStr = norm;
          break;
        }
      }
    }

    // Skip TBD dates
    if (title && !dateStr) {
      const rawDate = dateIdx >= 0 && dateIdx < values.length ? values[dateIdx].trim() : '';
      if (isTBD(rawDate)) {
        errors.push(`第 ${rowIdx + 1} 行: "${title}" 日期待定(TBD)，已跳过`);
        continue;
      }
    }

    if (!title || !dateStr) {
      errors.push(`第 ${rowIdx + 1} 行: 缺少标题或日期（标题="${title}", 日期="${dateStr}"）`);
      continue;
    }

    // Build object from headers
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (i < values.length) obj[h] = values[i];
    });

    const { tumorType, location, scale, type, description, attendees, speakers } = obj as any;
    const attendeesNum = attendees ? parseInt(attendees.toString().replace(/,/g, '')) : 0;
    const scaleVal: EventScale = (scale as EventScale) || getScaleFromAttendees(attendeesNum);

    events.push({
      id: `imported-${Date.now()}-${rowIdx}`,
      title,
      date: dateStr,
      tumorType: (TUMOR_TYPES.includes(tumorType as any) ? tumorType : '食管癌') as TumorType,
      location: location || '待定',
      scale: (['小型', '中型', '大型', '超大型'].includes(scaleVal) ? scaleVal : '中型') as EventScale,
      type: type || '其他',
      description: description || '',
      speakers: speakers ? speakers.toString().split(/[,，、|]/).map((s: string) => s.trim()).filter(Boolean) : undefined,
      attendees: attendeesNum > 0 ? attendeesNum : undefined,
    });
  }

  return { events, errors };
}
