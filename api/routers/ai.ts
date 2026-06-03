import { env } from "../lib/env";

function getAccessToken(): string {
  if (env.moonshotApiKey) return env.moonshotApiKey;
  throw new Error(
    "缺少 Moonshot API Key。请在 .env 文件中添加 MOONSHOT_API_KEY=sk-xxx。"
    + "获取方式：登录 https://platform.moonshot.cn → 创建 API Key"
  );
}

// ===== AI Chat Completion (Streaming) =====
const SYSTEM_PROMPT = `你是一个专业的医药市场活动分析助手。你的任务是帮助用户分析市场活动数据，回答关于活动安排、预算、瘤种分布、KOL参与等方面的问题。

## 数据字段说明
- title: 活动名称
- date: 活动日期 (YYYY-MM-DD)
- tumorType: 瘤种类型（肺癌、乳腺癌、结直肠癌、胃癌、肝癌、食管癌、胰腺癌、前列腺癌、卵巢癌、淋巴瘤、黑色素瘤、头颈癌）
- location: 活动地点
- scale: 活动规模（小型<15人、中型15-79人、大型80-299人、超大型>300人）
- type: 活动类型（学术会议、圆桌讨论、科室会、手术直播、患者教育、专家巡讲、卫星会、病例讨论）
- description: 学术策略描述
- speakers: KOL/专家列表
- attendees: 预计参会人数
- budget: 预算金额（人民币）
- onlineOffline: 线上/线下/混合
- region/province/city: 区域信息
- hospital: 医院
- kol: KOL
- links: 会议链接（直播/回放）

## 回答要求
1. 用中文回答
2. 数据要准确，基于提供的活动数据
3. 对于数字类问题，给出具体的统计结果和计算过程
4. 可以适当给出建议性的洞察
5. 如果不确定，明确说明"根据现有数据..."
6. 保持专业、简洁、有条理`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Stream chat completion from Kimi AI
 * Returns a ReadableStream for SSE
 */
export async function createChatStream(
  userMessage: string,
  eventsJson: string
): Promise<ReadableStream> {
  const token = getAccessToken();

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `以下是系统中当前所有的市场活动数据（JSON格式），请基于这些数据回答用户问题：\n\n${eventsJson}`,
    },
    { role: "user", content: userMessage },
  ];

  const apiResponse = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      messages,
      stream: true,
      temperature: 0.6,
      max_tokens: 4096,
    }),
  });

  if (!apiResponse.ok) {
    const errorText = await apiResponse.text().catch(() => "Unknown error");
    throw new Error(`AI API error (${apiResponse.status}): ${errorText}`);
  }

  if (!apiResponse.body) {
    throw new Error("AI API response body is null");
  }

  // Transform the API's SSE stream into a clean SSE stream
  const reader = apiResponse.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                // Forward as SSE
                const sseData = `data: ${JSON.stringify({ content })}\n\n`;
                controller.enqueue(new TextEncoder().encode(sseData));
              }
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  const sseData = `data: ${JSON.stringify({ content })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sseData));
                }
              } catch {
                // ignore
              }
            }
          }
        }

        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },

    cancel() {
      reader.cancel();
    },
  });
}

/**
 * Simple non-streaming chat (for quick queries)
 */
export async function chatCompletion(
  userMessage: string,
  eventsJson: string
): Promise<string> {
  const token = getAccessToken();

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `以下是系统中当前所有的市场活动数据：\n\n${eventsJson}`,
    },
    { role: "user", content: userMessage },
  ];

  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      messages,
      stream: false,
      temperature: 0.6,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || "AI 未能生成回复";
}
