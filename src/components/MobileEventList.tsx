import { useState, useMemo } from 'react';
import { Stethoscope, MapPin, Users, Calendar, Filter } from 'lucide-react';
import type { MarketEvent } from '@/types';
import { SCALE_CONFIG, TUMOR_COLORS } from '@/types';

interface WeekInfo { weekNum: number; startDate: number; endDate: number; hasEvents: boolean; }

interface MobileEventListProps {
  events: MarketEvent[]; weekFilteredEvents: MarketEvent[]; selectedWeek: number | null; weeks: WeekInfo[];
  onSelectEvent: (evt: MarketEvent) => void; onSelectWeek: (w: number | null) => void;
  filterTumor: string; filterScale: string; onFilterTumor: (t: string) => void; onFilterScale: (s: string) => void;
}

export default function MobileEventList({ events, weekFilteredEvents, selectedWeek, weeks, onSelectEvent, onSelectWeek, filterTumor, filterScale, onFilterTumor, onFilterScale }: MobileEventListProps) {
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return weekFilteredEvents.filter((e) => {
      const matchTumor = filterTumor === '全部' || e.tumorType === filterTumor;
      const matchScale = filterScale === '全部' || e.scale === filterScale;
      return matchTumor && matchScale;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [weekFilteredEvents, filterTumor, filterScale]);

  const grouped = useMemo(() => {
    const map = new Map<string, MarketEvent[]>();
    filtered.forEach((e) => { const list = map.get(e.date) || []; list.push(e); map.set(e.date, list); });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const tumorTypes = useMemo(() => { const types = new Set(events.map((e) => e.tumorType)); return ['全部', ...Array.from(types).sort()]; }, [events]);
  const scaleOptions = ['全部', '小型', '中型', '大型', '超大型'];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    return `${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  }

  return (
    <div className="sm:hidden">
      {/* Week nav */}
      {weeks.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 px-1 scrollbar-hide">
          <button onClick={() => onSelectWeek(null)} className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
            style={{ backgroundColor: selectedWeek === null ? '#D62B1E' : '#ffffff', color: selectedWeek === null ? '#ffffff' : 'var(--midnight-blue)', border: selectedWeek === null ? '1px solid #D62B1E' : '1px solid var(--cloud-gray)' }}>全部</button>
          {weeks.map((w) => (
            <button key={w.weekNum} onClick={() => onSelectWeek(selectedWeek === w.weekNum ? null : w.weekNum)} className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all relative"
              style={{ backgroundColor: selectedWeek === w.weekNum ? '#0F253B' : '#ffffff', color: selectedWeek === w.weekNum ? '#ffffff' : 'var(--midnight-blue)', border: selectedWeek === w.weekNum ? '1px solid #0F253B' : '1px solid var(--cloud-gray)' }}>
              第{w.weekNum}周
              {w.hasEvents && selectedWeek !== w.weekNum && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#D62B1E' }} />}
            </button>
          ))}
        </div>
      )}

      {/* Filter toggle */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={() => setShowFilters((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold btn-pill-swiss" style={{ color: 'var(--midnight-blue)' }}>
          <Filter className="w-3 h-3" />筛选
          {(filterTumor !== '全部' || filterScale !== '全部') && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D62B1E' }} />}
        </button>
        <span className="text-xs font-semibold" style={{ color: 'var(--slate-gray)' }}>{filtered.length} 场活动</span>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="mb-3 p-4 rounded-xl card-swiss">
          <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--slate-gray)' }}>瘤种</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {tumorTypes.map((t) => (
              <button key={t} onClick={() => onFilterTumor(t)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ backgroundColor: filterTumor === t ? '#D62B1E' : '#F5F5F3', color: filterTumor === t ? '#ffffff' : 'var(--midnight-blue)', border: filterTumor === t ? '1px solid #D62B1E' : '1px solid var(--cloud-gray)' }}>{t}</button>
            ))}
          </div>
          <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--slate-gray)' }}>规模</p>
          <div className="flex flex-wrap gap-2">
            {scaleOptions.map((s) => (
              <button key={s} onClick={() => onFilterScale(s)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ backgroundColor: filterScale === s ? '#0F253B' : '#F5F5F3', color: filterScale === s ? '#ffffff' : 'var(--midnight-blue)', border: filterScale === s ? '1px solid #0F253B' : '1px solid var(--cloud-gray)' }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Event list */}
      <div className="space-y-4">
        {grouped.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 card-inner-swiss" style={{ color: 'var(--slate-gray)' }}><Calendar className="w-7 h-7" /></div>
            <p className="text-sm font-semibold" style={{ color: 'var(--midnight-blue)' }}>本月暂无活动</p>
          </div>
        )}
        {grouped.map(([date, dayEvents]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: date === todayStr ? '#D62B1E' : '#0F253B' }}>{new Date(date+'T00:00:00').getDate()}</div>
              <span className="text-sm font-bold" style={{ color: 'var(--oxford-blue)' }}>{formatDateLabel(date)}</span>
              {date === todayStr && <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(214,43,30,0.1)', color: '#D62B1E' }}>今天</span>}
              <span className="text-xs ml-auto font-semibold" style={{ color: 'var(--slate-gray)' }}>{dayEvents.length} 场</span>
            </div>
            <div className="space-y-2">
              {dayEvents.map((evt) => {
                const scaleCfg = SCALE_CONFIG[evt.scale]; const tumorColor = TUMOR_COLORS[evt.tumorType];
                return (
                  <button key={evt.id} onClick={() => onSelectEvent(evt)} className="w-full text-left rounded-xl p-3.5 card-swiss-hover">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: scaleCfg.color+'12', color: scaleCfg.color }}>{evt.scale}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: tumorColor+'10', color: tumorColor }}><Stethoscope className="w-2.5 h-2.5" />{evt.tumorType}</span>
                      {evt.ta && <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: '#F5F5F3', color: 'var(--slate-gray)' }}>{evt.ta}</span>}
                    </div>
                    <p className="text-sm font-bold leading-snug mb-2" style={{ color: 'var(--oxford-blue)' }}>{evt.title}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--slate-gray)' }}><MapPin className="w-3 h-3" />{evt.location}</span>
                      {evt.attendees && <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--slate-gray)' }}><Users className="w-3 h-3" />{evt.attendees}人</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
