"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Send, Loader2, Bot, User, X, Check, Edit3, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { _id?: string; role: "user" | "assistant"; content: string; timestamp: string; isOptimistic?: boolean };

// ==========================================
// 1. STUDIO-GRADE MESSAGE COMPONENT (MONOCHROMATIC)
// ==========================================
const ChatMessage = memo(function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "flex-row-reverse" : ""
      } ${msg.isOptimistic ? "opacity-60" : "opacity-100"} transition-opacity duration-200`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
          isUser
            ? "bg-zinc-800 border-zinc-700 text-zinc-100"
            : "bg-zinc-900 border-zinc-800 text-zinc-400"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed rounded-md border ${
          isUser
            ? "bg-zinc-900 text-zinc-100 border-zinc-800 shadow-sm"
            : "bg-zinc-950/90 text-zinc-200 border-zinc-800/80"
        }`}
      >
        <div className="markdown-body text-sm break-words w-full overflow-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-lg font-semibold mt-4 mb-2 pb-1 border-b border-zinc-800 text-zinc-100" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-base font-semibold mt-3 mb-2 pb-1 border-b border-zinc-800 text-zinc-100" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-sm font-semibold mt-3 mb-1 text-zinc-200" {...props} />
              ),
              p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-zinc-300" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-300" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-300" {...props} />,
              li: ({ node, ...props }) => <li className="pl-1" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-zinc-100" {...props} />,
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto mb-3 w-full rounded-md border border-zinc-800">
                  <table className="w-full text-left border-collapse text-xs" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => <thead className="bg-zinc-900 text-zinc-300" {...props} />,
              th: ({ node, ...props }) => (
                <th className="px-3 py-2 font-medium border-b border-zinc-800 uppercase tracking-wider" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="px-3 py-2 border-b border-zinc-800/60 text-zinc-300 last:border-0" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  className="border-l-2 border-zinc-600 pl-3 py-1 italic text-zinc-400 bg-zinc-900/40 rounded-r-md my-3"
                  {...props}
                />
              ),
              code: ({ node, inline, className, children, ...props }: any) => {
                return inline ? (
                  <code className="bg-zinc-800 text-zinc-200 px-1 py-0.5 rounded text-xs font-mono border border-zinc-700/60" {...props}>
                    {children}
                  </code>
                ) : (
                  <div className="relative my-3">
                    <pre className="bg-zinc-950 text-zinc-300 p-3 rounded-md overflow-x-auto text-xs font-mono border border-zinc-800">
                      <code {...props}>{children}</code>
                    </pre>
                  </div>
                );
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

// ==========================================
// 2. MONOCHROMATIC TYPING INDICATOR
// ==========================================
const TypingIndicator = () => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-zinc-900 border border-zinc-800">
      <Bot className="w-4 h-4 text-zinc-500" />
    </div>
    <div className="bg-zinc-900/60 border border-zinc-800 px-4 py-3 rounded-md flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
    </div>
  </div>
);

// ==========================================
// 3. MAIN CHAT INTERFACE
// ==========================================
type ChatInterfaceProps = {
  activeProjectId: string | null;
  onProjectCreated?: (id: string) => void;
  onStoryboardReady?: () => void;
};

export default function ChatInterface({ activeProjectId, onProjectCreated, onStoryboardReady }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [wantsToAdjust, setWantsToAdjust] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: isProjectLoading } = useQuery<Message[]>({
    queryKey: ["chatMessages", activeProjectId || "draft"],
    enabled: !!activeProjectId,
    queryFn: async () => {
      if (!activeProjectId) return [];
      const res = await fetch(`/api/projects/${activeProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch project history");
      const data = await res.json();
      return data.chatHistory || [];
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    setWantsToAdjust(false);
  }, [messages.length]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: async (userMessage: Message) => {
      const groqApiKey = localStorage.getItem("director_groq_key") || "";
      const preferredChatModel = "openai/gpt-oss-20b";

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (groqApiKey) {
        headers["Authorization"] = `Bearer ${groqApiKey}`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          projectId: activeProjectId,
          content: userMessage.content,
          imageBase64,
          chatModel: preferredChatModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error("MISSING_KEY");
        }
        throw new Error(errorData.error || "Failed to generate AI response");
      }

      return res.json();
    },
    onMutate: async (userMessage: Message) => {
      await queryClient.cancelQueries({ queryKey: ["chatMessages", activeProjectId || "draft"] });
      const previousMessages = queryClient.getQueryData<Message[]>(["chatMessages", activeProjectId || "draft"]) || [];

      queryClient.setQueryData<Message[]>(["chatMessages", activeProjectId || "draft"], [
        ...previousMessages,
        { ...userMessage, isOptimistic: true },
      ]);

      setImageBase64(null);
      return { previousMessages };
    },
    onSuccess: (data) => {
      if (!activeProjectId && data.projectId) {
        onProjectCreated?.(data.projectId);
      }

      queryClient.setQueryData<Message[]>(["chatMessages", data.projectId || activeProjectId], (old = []) => [
        ...old.filter((m) => !m.isOptimistic),
        { ...data.message, timestamp: Date.now().toString() },
      ]);

      queryClient.invalidateQueries({ queryKey: ["storyboardData", data.projectId || activeProjectId] });

      if (data.storyboard && data.storyboard.length > 0) {
        onStoryboardReady?.();
      }
    },
    onError: (err: any, _, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["chatMessages", activeProjectId || "draft"], context.previousMessages);
      }
      if (err.message === "MISSING_KEY" || err.message.includes("Missing Groq API Key")) {
        alert("Please open Settings and enter your Groq API Key.");
      } else {
        alert(err.message || "Failed to communicate with Director AI.");
      }
    },
  });

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleSend = (e?: React.FormEvent, directMessage?: string) => {
    e?.preventDefault();
    const finalMessage = directMessage || input;
    if (!finalMessage.trim() && !imageBase64) return;

    mutation.mutate({ timestamp: Date.now().toString(), role: "user", content: finalMessage });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, mutation.isPending]);

  // Workflow detection
  const lastMsgText = messages[messages.length - 1]?.content.toLowerCase() || "";
  const isSatisfactoryQuestion =
    !mutation.isPending && messages[messages.length - 1]?.role === "assistant" && lastMsgText.includes("satisfactory");
  const isReadyQuestion =
    !mutation.isPending && messages[messages.length - 1]?.role === "assistant" && lastMsgText.includes("ready");
  const isImageRequestQuestion =
    !mutation.isPending && messages[messages.length - 1]?.role === "assistant" && lastMsgText.includes("you decide");
  const isActionRequired = isSatisfactoryQuestion || isReadyQuestion || isImageRequestQuestion;

  const hasContent = Boolean(input.trim() || imageBase64);

  if (isProjectLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs font-mono">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        <span>Loading screenplay...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar scroll-smooth">
        {messages.length === 0 && !mutation.isPending && (
          <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-4 shadow-sm">
              <Bot className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight mb-1">
              Writer&apos;s Room
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Define your concept, characters, and sequence flow. When the story is locked, proceed to the node compositor canvas.
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <ChatMessage key={msg._id || msg.timestamp || index} msg={msg} />
        ))}

        {mutation.isPending && <TypingIndicator />}
        <div ref={messagesEndRef} className="h-4 w-full" />
      </div>

      {/* Input Area: Strictly border-t border-zinc-800 */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800">
        {isActionRequired && !wantsToAdjust ? (
          <div className="flex flex-col gap-2.5 mb-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Director Action Required
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  if (isReadyQuestion) handleSend(undefined, "Yes, I am ready. Generate the final storyboard.");
                  else if (isSatisfactoryQuestion) handleSend(undefined, "Yes, the script is satisfactory. Proceed.");
                  else if (isImageRequestQuestion) handleSend(undefined, "You decide. Establish the aesthetic for us.");
                }}
                className="flex-1 h-9 px-4 rounded-md bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {isImageRequestQuestion ? <Sparkles className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                <span>
                  {isReadyQuestion
                    ? "Generate Storyboard"
                    : isSatisfactoryQuestion
                    ? "Script is Satisfactory"
                    : "Establish Aesthetic"}
                </span>
              </button>

              <button
                onClick={() => {
                  setWantsToAdjust(true);
                  setTimeout(() => {
                    if (isImageRequestQuestion) fileInputRef.current?.click();
                    else textareaRef.current?.focus();
                  }, 50);
                }}
                className="flex-1 h-9 px-4 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Adjust Parameters</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Text Input Form */}
        <div className="relative">
          {imageBase64 && (
            <div className="mb-2 relative inline-block">
              <img
                src={imageBase64}
                alt="Upload preview"
                className="h-16 w-16 rounded-md border border-zinc-700 object-cover"
              />
              <button
                onClick={() => setImageBase64(null)}
                className="absolute -top-1.5 -right-1.5 bg-zinc-900 border border-zinc-700 rounded-full p-0.5 text-zinc-300 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-end bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 rounded-md p-1.5 transition-colors"
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach visual anchor image"
              className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              data-testid="chat-input"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Direct the sequence, describe scenes or request changes..."
              className="flex-1 bg-transparent border-none outline-none px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 resize-none min-h-[36px] max-h-[160px] custom-scrollbar"
              rows={1}
            />

            {/* Submit Button: Stark white inversion when active, subtle ghost when disabled */}
            <button
              type="submit"
              data-testid="chat-submit"
              disabled={!hasContent || mutation.isPending}
              className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                hasContent && !mutation.isPending
                  ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                  : "text-zinc-600 bg-transparent cursor-not-allowed"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-500 font-mono">
            <span>Press Enter to send, Shift + Enter for newline</span>
            <span>Groq 20B Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}