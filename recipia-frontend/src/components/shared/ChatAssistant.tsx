import { useState, useRef, useEffect } from "react";
import { Zap, X, Send } from "lucide-react";
import { api } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_SUGGESTIONS = ["Keto options?", "Nutritional info?", "Quick meals"];

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your culinary assistant. I can help you find recipes, suggest substitutes, or adjust portion sizes. What are we cooking today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await api.ai.chat(userMsg.content);
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      } else {
        setSuggestions(DEFAULT_SUGGESTIONS);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error?.message === "HTTP error! status: 401"
              ? "Your session has expired. Please sign in again to continue chatting."
              : "Sorry, something went wrong. Please try again.",
        },
      ]);
      setSuggestions(DEFAULT_SUGGESTIONS);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
      >
        <Zap className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-screen w-96 bg-card border-l border-border shadow-xl flex flex-col z-50 animate-slide-in-right">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">AI Recipe Assistant</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-chat-user text-chat-user-foreground rounded-br-md"
                  : "bg-chat-assistant text-chat-assistant-foreground rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-chat-assistant rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.15s]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-input bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
