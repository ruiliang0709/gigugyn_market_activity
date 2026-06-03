import { useRef, useEffect } from "react";
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Square,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import type { ChatMessage } from "@/hooks/useAIChat";

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
}

const QUICK_QUESTIONS = [
  "本月各瘤种活动数量统计",
  "预算最高的前5场活动是哪些？",
  "线上和线下活动各占多少？",
  "哪个区域的活动最密集？",
  "有哪些活动的日期待定？",
];

export default function AIChatPanel({
  isOpen,
  onClose,
  messages,
  isStreaming,
  inputValue,
  onInputChange,
  onSend,
  onStop,
  onClear,
}: AIChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;
    onSend(inputValue);
  };

  const handleQuickQuestion = (q: string) => {
    if (isStreaming) return;
    onSend(q);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[420px] max-w-full"
      style={{
        background: "#fff",
        borderLeft: "1px solid #D9D9D6",
        boxShadow: "-8px 0 40px rgba(15,37,59,0.1)",
        animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{
          borderBottom: "1px solid #D9D9D6",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #003A70, #007A80)" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3
              className="text-sm font-bold leading-tight"
              style={{ color: "#0F253B" }}
            >
              AI 智能助手
            </h3>
            <p className="text-[10px]" style={{ color: "#96A3AD" }}>
              {isStreaming ? "思考中..." : "基于您的活动数据分析"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#96A3AD" }}
              title="清空对话"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "#96A3AD" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,58,112,0.08), rgba(0,122,128,0.08))",
              }}
            >
              <Bot className="w-7 h-7" style={{ color: "#003A70" }} />
            </div>
            <h4
              className="text-sm font-bold mb-1"
              style={{ color: "#0F253B" }}
            >
              活动数据智能分析
            </h4>
            <p
              className="text-xs text-center mb-5 max-w-[260px] leading-relaxed"
              style={{ color: "#96A3AD" }}
            >
              我可以帮您分析市场活动数据，包括活动分布、预算统计、KOL
              参与度等
            </p>

            {/* Quick Questions */}
            <div className="w-full space-y-1.5">
              <p
                className="text-[10px] font-bold px-1 mb-1.5"
                style={{ color: "#96A3AD" }}
              >
                快捷提问
              </p>
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleQuickQuestion(q)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all hover:translate-x-0.5"
                  style={{
                    background: "rgba(0,58,112,0.04)",
                    color: "#28334A",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#D9D9D6";
                    e.currentTarget.style.background = "rgba(0,58,112,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background =
                      "rgba(0,58,112,0.04)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {/* Avatar */}
            <div className="shrink-0 mt-0.5">
              {msg.role === "user" ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "#D62B1E" }}
                >
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              ) : msg.role === "error" ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(214,43,30,0.1)" }}
                >
                  <AlertCircle className="w-3.5 h-3.5" style={{ color: "#D62B1E" }} />
                </div>
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #003A70, #007A80)",
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                background:
                  msg.role === "user"
                    ? "#0F253B"
                    : msg.role === "error"
                      ? "rgba(214,43,30,0.06)"
                      : "#F5F5F3",
                color:
                  msg.role === "user"
                    ? "#fff"
                    : msg.role === "error"
                      ? "#D62B1E"
                      : "#28334A",
                borderRadius:
                  msg.role === "user"
                    ? "12px 12px 4px 12px"
                    : "4px 12px 12px 12px",
              }}
            >
              {msg.content || (isStreaming && msg.role === "assistant" ? (
                <span className="inline-flex items-center gap-1.5" style={{ color: "#96A3AD" }}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  思考中...
                </span>
              ) : null)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="shrink-0 px-4 py-3"
        style={{
          borderTop: "1px solid #D9D9D6",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="输入问题，例如：本月活动预算总计多少？"
              className="w-full px-3.5 py-2.5 pr-3 rounded-xl text-xs outline-none transition-all"
              style={{
                background: "#F5F5F3",
                color: "#0F253B",
                border: "1px solid transparent",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#96A3AD";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "transparent";
              }}
              disabled={isStreaming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{ background: "rgba(214,43,30,0.1)", color: "#D62B1E" }}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{
                background: inputValue.trim() ? "#0F253B" : "#D9D9D6",
                color: "#fff",
              }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
