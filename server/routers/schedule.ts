import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { events } from "../../db/schema";
import { sql } from "drizzle-orm";
import { env } from "../lib/env";

function getAccessToken(): string {
  if (env.moonshotApiKey) return env.moonshotApiKey;
  throw new Error(
    "缺少 Moonshot API Key。请在 .env 文件中添加 MOONSHOT_API_KEY=sk-xxx。"
    + "获取方式：登录 https://platform.moonshot.cn → 创建 API Key"
  );
}

// ===== AI Schedule Parser =====
const SCHEDULE_PARSE_PROMPT = `你是一个专业的医药学术会议日程解析助手。你的任务是解析用户上传的会议日程文本，提取出结构化信息。

## 提取规则
请严格按照以下 JSON 格式返回，不要添加任何其他文字：

{"chairmen": ["主席1"], "speakers": ["讲者1"], "topics": ["议题1"], "links": [{"label": "直播链接", "url": "https://..."}], "qrCodes": [], "schedule": "格式化日程", "notes": "备注"}

## 字段说明
- chairmen: 会议主席、主持人名单（注意区分"主席"和"讲者"）
- speakers: 所有讲者/演讲嘉宾（不包括主席）
- topics: 演讲议题/主题列表
- links: 从文本中提取的所有URL，标注类型（直播、回放、注册、问卷等）
- qrCodes: 如果有二维码描述，记录用途；否则留空数组
- schedule: 用清晰格式重新组织日程（保留时间、讲者、议题）
- notes: 其他重要信息（会议号、密码、联系人等）

## 注意事项
1. 只返回纯JSON，不要markdown代码块，不要额外解释
2. 没有内容的字段返回空数组或空字符串
3. 链接必须包含完整URL（以http://或https://开头）
4. 区分主席和讲者：主席是"主持/主席"，讲者是"演讲/分享/报告"
5. 日程格式要清晰易读，保留时间段`;

interface ParsedSchedule {
  chairmen: string[];
  speakers: string[];
  topics: string[];
  links: Array<{ label: string; url: string }>;
  qrCodes: string[];
  schedule: string;
  notes: string;
}

/**
 * Call Kimi API to parse schedule text
 */
async function parseScheduleWithAI(scheduleText: string): Promise<ParsedSchedule> {
  const token = getAccessToken();

  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      messages: [
        { role: "system", content: SCHEDULE_PARSE_PROMPT },
        { role: "user", content: `请解析以下会议日程：\n\n${scheduleText}` },
      ],
      stream: false,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from response
  let jsonStr = content.trim();
  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```\n?/, "").replace(/\n?```/, "").trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as ParsedSchedule;
    // Validate required fields
    return {
      chairmen: parsed.chairmen || [],
      speakers: parsed.speakers || [],
      topics: parsed.topics || [],
      links: parsed.links || [],
      qrCodes: parsed.qrCodes || [],
      schedule: parsed.schedule || "",
      notes: parsed.notes || "",
    };
  } catch {
    // If JSON parse fails, return a basic structure with raw text
    return {
      chairmen: [],
      speakers: [],
      topics: [],
      links: [],
      qrCodes: [],
      schedule: scheduleText,
      notes: "AI 解析失败，已保留原始文本。",
    };
  }
}

// ===== Router =====
export const scheduleRouter = createRouter({
  // Parse schedule text with AI
  parse: publicQuery
    .input(z.object({ scheduleText: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const parsed = await parseScheduleWithAI(input.scheduleText);
      return parsed;
    }),

  // Save schedule & extracted info to an event
  save: publicQuery
    .input(z.object({
      eventId: z.number(),
      scheduleText: z.string(),
      extractedInfo: z.object({
        chairmen: z.array(z.string()),
        speakers: z.array(z.string()),
        topics: z.array(z.string()),
        links: z.array(z.object({ label: z.string(), url: z.string() })),
        qrCodes: z.array(z.string()),
        schedule: z.string(),
        notes: z.string(),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(events)
        .set({
          scheduleText: input.scheduleText,
          extractedInfo: input.extractedInfo,
        })
        .where(sql`${events.id} = ${input.eventId}`);
      return { ok: true };
    }),

  // Clear schedule from an event
  clear: publicQuery
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(events)
        .set({ scheduleText: null, extractedInfo: null })
        .where(sql`${events.id} = ${input.eventId}`);
      return { ok: true };
    }),
});
