import type { MarketEvent, EventType } from '@/types';
import { TUMOR_TYPES, EVENT_TYPES, EVENT_SCALES } from '@/types';

// Seeded random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}

const LOCATIONS = [
  '北京协和医院', '上海瑞金医院', '广州中山肿瘤防治中心', '成都华西医院',
  '武汉同济医院', '西安西京医院', '南京鼓楼医院', '杭州浙大一附院',
  '长沙湘雅医院', '济南齐鲁医院', '郑州大学一附院', '重庆西南医院',
  '天津肿瘤医院', '沈阳盛京医院', '哈尔滨医大一院', '福州协和医院'
];

const EVENT_TITLES: Record<EventType, string[]> = {
  '学术会议': [
    '肿瘤免疫治疗高峰论坛', '精准医学学术年会', '靶向治疗前沿进展',
    '多学科诊疗(MDT)研讨会', '肿瘤规范化诊疗培训班'
  ],
  '圆桌讨论': [
    '专家圆桌-晚期治疗策略', '跨学科病例研讨', '新药临床应用经验分享',
    '肿瘤精准诊疗专家共识讨论'
  ],
  '科室会': [
    '肿瘤内科科室学术交流会', '呼吸科肺癌诊疗进展', '消化科胃肠肿瘤研讨',
    '泌尿外科前列腺癌诊疗更新'
  ],
  '手术直播': [
    '微创手术直播演示', '机器人辅助手术示教', '腔镜手术技巧分享',
    '复杂病例手术直播'
  ],
  '患者教育': [
    '肿瘤患者康复指导讲座', '抗癌知识科普活动', '患者心理支持工作坊',
    '营养管理与生活质量提升'
  ],
  '专家巡讲': [
    '全国肿瘤防治宣传巡讲', '基层医院学术帮扶', '疑难病例查房指导',
    ' regional 学术推广活动'
  ],
  '卫星会': [
    'CSCO卫星会-最新研究解读', 'ASCO精华内容分享会', 'ESMO热点速递',
    '国际会议精华荟萃'
  ],
  '病例讨论': [
    '疑难病例MDT讨论会', '典型病例分享交流', '罕见病例诊治经验',
    '临床试验入组病例筛选会'
  ]
};

const DESCRIPTION_TEMPLATES: Record<EventType, string[]> = {
  '学术会议': [
    '汇聚全国顶尖专家，共同探讨最新诊疗进展与临床实践策略。',
    '聚焦前沿研究成果，推动肿瘤诊疗规范化与个体化发展。',
    '搭建高水平学术交流平台，促进多学科协作与经验分享。'
  ],
  '圆桌讨论': [
    '邀请领域权威专家，深入探讨临床热点难点问题。',
    '以病例为导向，展开多学科视角的深度对话。',
    '促进产学研医深度交流，碰撞学术思想火花。'
  ],
  '科室会': [
    '面向科室医护人员，分享最新临床证据与用药经验。',
    '结合科室特色病种，探讨个体化诊疗方案的优化策略。',
    '提升科室整体诊疗水平，促进学术氛围建设。'
  ],
  '手术直播': [
    '实时演示高难度手术操作，分享微创技术要点。',
    '通过高清直播展示精细化手术技巧与术中决策。',
    '为青年医师提供直观的学习平台与互动答疑机会。'
  ],
  '患者教育': [
    '帮助患者及家属了解疾病知识，树立科学抗癌信心。',
    '提供全方位的康复指导，改善患者生活质量。',
    '搭建医患沟通桥梁，传递温暖与关怀。'
  ],
  '专家巡讲': [
    '将优质学术资源下沉基层，提升区域诊疗能力。',
    '走进基层医院，面对面解决临床实际问题。',
    '助力分级诊疗体系建设，推动医疗均质化发展。'
  ],
  '卫星会': [
    '第一时间解读国际顶级会议最新研究成果。',
    '精选重要临床试验数据，指导临床实践决策。',
    '连接全球学术前沿，共享智慧医疗成果。'
  ],
  '病例讨论': [
    '以真实病例为载体，锻炼临床思维与决策能力。',
    '汇集多学科智慧，为疑难患者制定最优方案。',
    '促进临床经验的传承与创新。'
  ]
};

const SPEAKER_POOL = [
  '张明教授', '李华主任', '王芳教授', '陈强主任医师',
  '刘洋教授', '赵敏主任', '孙磊教授', '周静主任医师',
  '吴刚教授', '郑丽主任', '黄伟教授', '林娜主任医师'
];

export function generateRandomEvents(year: number, month: number): MarketEvent[] {
  seed = year * 100 + month;
  const events: MarketEvent[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  // Generate 12-20 events per month
  const eventCount = randomInt(12, 20);

  for (let i = 0; i < eventCount; i++) {
    const day = randomInt(1, daysInMonth);
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const eventType = randomItem(EVENT_TYPES);
    const tumorType = randomItem(TUMOR_TYPES);
    const scale = randomItem(EVENT_SCALES);
    const location = randomItem(LOCATIONS);
    const title = randomItem(EVENT_TITLES[eventType]);
    const description = randomItem(DESCRIPTION_TEMPLATES[eventType]);

    const baseAttendees = {
      '小型': randomInt(10, 30),
      '中型': randomInt(30, 100),
      '大型': randomInt(100, 500),
      '超大型': randomInt(500, 1200)
    };

    const speakerCount = randomInt(1, 4);
    const speakers: string[] = [];
    const shuffled = [...SPEAKER_POOL].sort(() => seededRandom() - 0.5);
    for (let s = 0; s < speakerCount; s++) {
      speakers.push(shuffled[s]);
    }

    events.push({
      id: `evt-${year}-${month}-${i}`,
      title: `${title}——${tumorType}专场`,
      date,
      tumorType,
      location,
      scale,
      type: eventType,
      description,
      speakers,
      attendees: baseAttendees[scale]
    });
  }

  // Sort by date
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function getDefaultEvents(): MarketEvent[] {
  // Generate for current month and next month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  return [
    ...generateRandomEvents(currentYear, currentMonth),
    ...generateRandomEvents(nextYear, nextMonth)
  ];
}
