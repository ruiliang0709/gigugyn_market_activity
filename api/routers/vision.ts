import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { env } from "../lib/env";

function getAccessToken(): string {
  if (env.moonshotApiKey) return env.moonshotApiKey;
  throw new Error(
    "缺少 Moonshot API Key。请在 .env 文件中添加 MOONSHOT_API_KEY=sk-xxx。"
    + "获取方式：登录 https://platform.moonshot.cn → 创建 API Key"
  );
}

// ===== Vision Prompt =====
const VISION_PROMPT = `你是一个专业的医药学术会议信息提取助手。请仔细分析用户上传的会议日程图片，提取以下信息。

请严格按照以下 JSON 格式返回，不要添加任何其他文字：

{"chairmen":["主席1"],"speakers":["讲者1","讲者2"],"notes":"会议内容分析"}

## 提取规则

### chairmen（主席/主持人）
- 只提取主席、主持人、大会主席的姓名
- 医生姓名要尽量完整（如"张三 主任医师 北京协和医院"提取为"张三"）

### speakers（讲者）
- 提取所有演讲嘉宾、报告人的姓名
- 不包括主席/主持人

### notes（会议内容分析）
- 仔细阅读图片中的议程/日程安排
- 总结这个会议主要讲了什么内容（如"晚期肺癌免疫治疗进展"、"乳腺癌新辅助治疗策略"等）
- 如果有多位讲者，分别概括每位讲者的演讲主题
- 提炼会议的核心议题和关键信息
- 如果没有足够信息，写"未明确标注议题"
- 用中文撰写

## 重要原则
1. 只返回纯JSON，不要markdown代码块，不要额外解释
2. 没有内容的字段返回空数组或空字符串
3. notes 字段要提炼会议核心内容，不要只罗列原始文字`;

export interface VisionResult {
  chairmen: string[];
  speakers: string[];
  notes: string;
}

/**
 * Call Kimi Vision API to analyze an image
 */
export async function analyzeImageWithAI(base64Image: string): Promise<VisionResult> {
  const token = getAccessToken();

  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "moonshot-v1-8k-vision-preview",
      messages: [
        { role: "system", content: VISION_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64Image },
            },
            {
              type: "text",
              text: "请提取这张会议日程图片中的主席、讲者、直播回放链接等信息。",
            },
          ],
        },
      ],
      stream: false,
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("[Vision] API error:", response.status, errorText);
    throw new Error(`AI 识别失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(`AI 返回错误: ${data.error.message || "未知错误"}`);
  }

  const content = data.choices?.[0]?.message?.content || "";
  console.log("[Vision] AI raw response:", content.substring(0, 500));

  // Extract JSON from response
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/```\n?/, "").replace(/\n?```/, "").trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as VisionResult;
    return {
      chairmen: parsed.chairmen || [],
      speakers: parsed.speakers || [],
      notes: parsed.notes || "",
    };
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as VisionResult;
        return {
          chairmen: parsed.chairmen || [],
          speakers: parsed.speakers || [],
          notes: parsed.notes || "",
        };
      } catch {
        // ignore
      }
    }
    return { chairmen: [], speakers: [], notes: "" };
  }
}

// ===== Router =====
export const visionRouter = createRouter({
  analyze: publicQuery
    .input(z.object({ imageBase64: z.string().min(100) }))
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeImageWithAI(input.imageBase64);
        return result;
      } catch (err: any) {
        console.error("[Vision] Analysis error:", err);
        throw err;
      }
    }),
});
