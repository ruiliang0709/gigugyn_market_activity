import { useState, useRef, useCallback } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };

      // Add placeholder assistant message
      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setInputValue("");

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text.trim() }),
        });

        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("响应为空");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        // Setup abort
        abortRef.current = () => {
          reader.cancel();
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, role: "error" as const, content: data.error }
                      : m
                  )
                );
                setIsStreaming(false);
                return;
              }
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              }
            } catch {
              // ignore malformed data
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  role: "error" as const,
                  content: err.message || "请求失败，请稍后重试",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming]
  );

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    inputValue,
    setInputValue,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
