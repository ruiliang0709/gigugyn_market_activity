export interface MarketEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  tumorType: TumorType;
  location: string;
  scale: EventScale;
  type: string;
  description: string;
  speakers?: string[];
  attendees?: number;
  budget?: number;
  onlineOffline?: 'Online' | 'Offline' | 'Combine';
  ta?: string;
  expCategory?: string;
  region?: string;
  province?: string;
  city?: string;
  hospital?: string;
  kol?: string;
  links?: MeetingLink[];
  // ---- AI Schedule Analysis ----
  scheduleText?: string;        // Raw uploaded schedule
  scheduleImage?: string;       // Base64 of uploaded schedule image
  extractedInfo?: ExtractedScheduleInfo;  // AI parsed info
}

/** Info extracted by AI from uploaded schedule */
export interface ExtractedScheduleInfo {
  chairmen: string[];           // 主席/主持人
  speakers: string[];           // 讲者
  topics: string[];             // 议题
  links: Array<{ label: string; url: string }>;  // 链接（直播/回放/注册等）
  qrCodes: string[];            // 二维码描述（如"扫码观看直播"）
  schedule: string;             // 格式化日程文本
  notes: string;                // 其他备注
}

export type TumorType =
  | '肺癌'
  | '乳腺癌'
  | '结直肠癌'
  | '胃癌'
  | '肝癌'
  | '食管癌'
  | '胰腺癌'
  | '前列腺癌'
  | '卵巢癌'
  | '淋巴瘤'
  | '黑色素瘤'
  | '头颈癌';

// ===== Meeting Link (live/replay links) =====
export interface MeetingLink {
  id: string;
  label: string;
  url: string;
}

export type EventScale = '小型' | '中型' | '大型' | '超大型';

export type EventType =
  | '学术会议'
  | '圆桌讨论'
  | '科室会'
  | '手术直播'
  | '患者教育'
  | '专家巡讲'
  | '卫星会'
  | '病例讨论';

export const TUMOR_TYPES: TumorType[] = [
  '肺癌', '乳腺癌', '结直肠癌', '胃癌', '肝癌',
  '食管癌', '胰腺癌', '前列腺癌', '卵巢癌', '淋巴瘤',
  '黑色素瘤', '头颈癌'
];

export const EVENT_TYPES: EventType[] = [
  '学术会议', '圆桌讨论', '科室会', '手术直播',
  '患者教育', '专家巡讲', '卫星会', '病例讨论'
];

export const EVENT_SCALES: EventScale[] = ['小型', '中型', '大型', '超大型'];

export const TA_MAP: Record<string, TumorType> = {
  'EC': '食管癌', 'LC': '肺癌', 'NSCLC': '肺癌', 'SCLC': '肺癌',
  'GC': '胃癌', 'CRC': '结直肠癌', 'BC': '乳腺癌', 'HCC': '肝癌',
  'PC': '前列腺癌', 'OC': '卵巢癌', 'NPC': '头颈癌', 'HNC': '头颈癌',
  'Lymph': '淋巴瘤', 'LYM': '淋巴瘤', 'Mel': '黑色素瘤', 'PanC': '胰腺癌',
};

export const USER_TYPE_MAP: Record<string, EventType> = {
  '线下系列会 1': '科室会', '线下系列会 2': '学术会议', '线下系列会 3': '病例讨论',
  '线上系列会 1': '学术会议', '线上系列会 2': '专家巡讲', '线上系列会 3': '卫星会',
  '大会': '学术会议', '三方会': '圆桌讨论', '专家讨论': '圆桌讨论',
  '手术直播': '手术直播', '患者教育': '患者教育',
};

// ===== SWISS MEDICAL BRAND COLOR SYSTEM =====
// Based on the reference color palette:
// Swiss Red #D62B1E, Oxford Blue #0F253B, Midnight Blue #28334A
// Deep Blue #003A70, Sky Blue #007A80, Burgundy #B3333B
// Autumn Yellow #EB7500, Sunflower #FFC72B
// Basalt Gray #827870, Cloud Gray #D9D9D6, Slate Gray #96A3AD

export const SWISS_COLORS = {
  swissRed: '#D62B1E',
  oxfordBlue: '#0F253B',
  midnightBlue: '#28334A',
  deepBlue: '#003A70',
  skyBlue: '#007A80',
  burgundy: '#B3333B',
  autumnYellow: '#EB7500',
  sunflower: '#FFC72B',
  basaltGray: '#827870',
  cloudGray: '#D9D9D6',
  slateGray: '#96A3AD',
} as const;

// Scale colors mapped to Swiss palette
export const SCALE_CONFIG: Record<EventScale, { color: string; bgColor: string; dotSize: number; label: string; gradientTop: string }> = {
  '小型': {
    color: '#007A80', bgColor: 'rgba(0,122,128,0.1)', dotSize: 6, label: '< 15人',
    gradientTop: 'linear-gradient(90deg, #009299, #007A80, #009299)',
  },
  '中型': {
    color: '#EB7500', bgColor: 'rgba(235,117,0,0.1)', dotSize: 8, label: '15-79人',
    gradientTop: 'linear-gradient(90deg, #FF8F1F, #EB7500, #FF8F1F)',
  },
  '大型': {
    color: '#D62B1E', bgColor: 'rgba(214,43,30,0.1)', dotSize: 12, label: '80-299人',
    gradientTop: 'linear-gradient(90deg, #E84538, #D62B1E, #E84538)',
  },
  '超大型': {
    color: '#003A70', bgColor: 'rgba(0,58,112,0.1)', dotSize: 16, label: '> 300人',
    gradientTop: 'linear-gradient(90deg, #004E8A, #003A70, #004E8A)',
  },
};

// Tumor type colors - Swiss medical palette
export const TUMOR_COLORS: Record<TumorType, string> = {
  '肺癌': '#D62B1E',
  '乳腺癌': '#B3333B',
  '结直肠癌': '#007A80',
  '胃癌': '#EB7500',
  '肝癌': '#D62B1E',
  '食管癌': '#003A70',
  '胰腺癌': '#827870',
  '前列腺癌': '#007A80',
  '卵巢癌': '#B3333B',
  '淋巴瘤': '#003A70',
  '黑色素瘤': '#28334A',
  '头颈癌': '#96A3AD',
};

export const TUMOR_GRADIENTS: Record<TumorType, string> = {
  '肺癌': 'linear-gradient(135deg, #E84538 0%, #D62B1E 100%)',
  '乳腺癌': 'linear-gradient(135deg, #C8484F 0%, #B3333B 100%)',
  '结直肠癌': 'linear-gradient(135deg, #009299 0%, #007A80 100%)',
  '胃癌': 'linear-gradient(135deg, #FF8F1F 0%, #EB7500 100%)',
  '肝癌': 'linear-gradient(135deg, #E84538 0%, #D62B1E 100%)',
  '食管癌': 'linear-gradient(135deg, #004E8A 0%, #003A70 100%)',
  '胰腺癌': 'linear-gradient(135deg, #968C84 0%, #827870 100%)',
  '前列腺癌': 'linear-gradient(135deg, #009299 0%, #007A80 100%)',
  '卵巢癌': 'linear-gradient(135deg, #C8484F 0%, #B3333B 100%)',
  '淋巴瘤': 'linear-gradient(135deg, #004E8A 0%, #003A70 100%)',
  '黑色素瘤': 'linear-gradient(135deg, #3E4B62 0%, #28334A 100%)',
  '头颈癌': 'linear-gradient(135deg, #AAB7C1 0%, #96A3AD 100%)',
};

export function getScaleFromAttendees(count: number): EventScale {
  if (count >= 300) return '超大型';
  if (count >= 80) return '大型';
  if (count >= 15) return '中型';
  return '小型';
}
