"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Send, Loader2, Bot, User, X, LayoutTemplate, ChevronRight, Check, XCircle, Edit3, Minimize2, Maximize } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = { _id?: string; role: "user" | "assistant"; content: string; timestamp: string; isOptimistic?: boolean };

// ==========================================
// 1. PRODUCTION-READY MESSAGE COMPONENT (GITHUB STYLE MARKDOWN)
// ==========================================
const ChatMessage = memo(function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  
  return (
    <div className={`flex items-end gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : ""} ${msg.isOptimistic ? "opacity-60" : "opacity-100"} transition-opacity duration-300`}>
      
      {/* Avatar */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
        isUser ? "bg-indigo-600 border-indigo-500" : "bg-zinc-800 border-zinc-700"
      }`}>
        {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-50" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />}
      </div>
      
      {/* Message Bubble - Adjusted max-width for better full-screen responsiveness */}
      <div className={`max-w-[90%] md:max-w-[85%] lg:max-w-[80%] px-4 sm:px-5 py-3 sm:py-4 shadow-md text-[14px] sm:text-[15px] leading-relaxed ${
        isUser 
          ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm" 
          : "bg-zinc-800/80 backdrop-blur-sm text-zinc-100 rounded-2xl rounded-bl-sm border border-zinc-700/50"
      }`}>
        
        {/* GitHub Style Markdown Engine */}
        <div className="markdown-body text-sm sm:text-base break-words w-full overflow-hidden">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, ...props}) => <h1 className="text-xl sm:text-2xl font-bold mt-6 mb-4 pb-2 border-b border-zinc-700/50 text-white" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-lg sm:text-xl font-bold mt-5 mb-3 pb-2 border-b border-zinc-700/50 text-white" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-base sm:text-lg font-bold mt-4 mb-2 text-zinc-200" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1 text-zinc-200" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-zinc-200" {...props} />,
              li: ({node, ...props}) => <li className="pl-1" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
              // Beautiful Table Styling
              table: ({node, ...props}) => (
                <div className="overflow-x-auto mb-4 w-full rounded-lg border border-zinc-700">
                  <table className="w-full text-left border-collapse" {...props} />
                </div>
              ),
              thead: ({node, ...props}) => <thead className="bg-zinc-900/80 text-zinc-300" {...props} />,
              th: ({node, ...props}) => <th className="px-4 py-3 font-semibold border-b border-zinc-700 text-sm uppercase tracking-wider" {...props} />,
              td: ({node, ...props}) => <td className="px-4 py-3 border-b border-zinc-700/50 text-zinc-300 last:border-0" {...props} />,
              // Stylized Blockquotes
              blockquote: ({node, ...props}) => (
                <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic text-zinc-400 bg-zinc-900/30 rounded-r-lg my-4" {...props} />
              ),
              // Code Block Styling
              code: ({node, inline, className, children, ...props}: any) => {
                return inline ? (
                  <code className="bg-zinc-900 text-indigo-300 px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-zinc-700/50" {...props}>
                    {children}
                  </code>
                ) : (
                  <div className="relative group my-4">
                    <pre className="bg-[#0d1117] text-zinc-300 p-4 rounded-xl overflow-x-auto text-[13px] sm:text-sm font-mono border border-zinc-800 shadow-inner">
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
// 2. THE TYPING INDICATOR
// ==========================================
const TypingIndicator = () => (
  <div className="flex items-end gap-3 animate-in fade-in slide-in-from-bottom-2">
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-zinc-800 border border-zinc-700 shadow-sm">
      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
    </div>
    <div className="bg-zinc-800/80 backdrop-blur-sm px-5 py-4 rounded-2xl rounded-bl-sm border border-zinc-700/50 flex items-center gap-1.5">
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
  onProjectCreated: (id: string) => void;
  onMinimize?: () => void; 
  onExpand?: () => void;
  isExpanded?: boolean;
};

export default function ChatInterface({ activeProjectId, onProjectCreated, onMinimize, onExpand, isExpanded }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [storyboardReady, setStoryboardReady] = useState(false); 
  const [wantsToAdjust, setWantsToAdjust] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); 
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading: isProjectLoading } = useQuery<Message[]>({
    queryKey: ["chatMessages", activeProjectId || "draft"],
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

  useEffect(() => {
    if (!activeProjectId) {
      setStoryboardReady(false);
    } else {
      const cachedProject: any = queryClient.getQueryData(["storyboardData", activeProjectId]);
      if (cachedProject?.storyboard && cachedProject.storyboard.length > 0) {
        setStoryboardReady(true);
      } else {
        setStoryboardReady(false);
      }
    }
  }, [activeProjectId, queryClient]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: async (newMsg: Message) => {
      setStoryboardReady(false); 

     // 1. GRAB SETTINGS FROM BROWSER
      const apiKey = localStorage.getItem("nvidia_api_key");
      const chatModel = localStorage.getItem("nvidia_chat_model") || "meta/llama-3.1-70b-instruct";
      
      if (!apiKey) {
        throw new Error("MISSING_KEY");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}` // 2. PASS THE KEY SECURELY
        },
        body: JSON.stringify({ 
          content: newMsg.content, 
          imageBase64, 
          projectId: activeProjectId,
          chatModel: chatModel // 3. PASS THE MODEL CHOICE
        }),
      });

      if (response.status === 401) throw new Error("INVALID_KEY");
      if (!response.ok) throw new Error("API Request Failed");
      
      return response.json();
    },
    onMutate: async (newMsg) => {
      await queryClient.cancelQueries({ queryKey: ["chatMessages", activeProjectId || "draft"] });
      const previousMessages = queryClient.getQueryData<Message[]>(["chatMessages", activeProjectId || "draft"]);
      queryClient.setQueryData<Message[]>(["chatMessages", activeProjectId || "draft"], (old = []) => [...old, { ...newMsg, isOptimistic: true }]);
      setImageBase64(null); 
      return { previousMessages };
    },
    onSuccess: (data) => {
      if (data.projectId && !activeProjectId) onProjectCreated(data.projectId);
      if (data.storyboard && data.storyboard.length > 0) {
        queryClient.setQueryData(["storyboardData", data.projectId], { storyboard: data.storyboard });
        setStoryboardReady(true); 
      }
      queryClient.setQueryData<Message[]>(["chatMessages", activeProjectId || "draft"], (old = []) => {
        const withoutOptimistic = old.filter((m) => !m.isOptimistic);
        return [...withoutOptimistic, { timestamp: Date.now().toString(), role: "assistant", content: data.message.content }];
      });
    },
    onError: (err: any, newMsg, context) => {
      if (context?.previousMessages) queryClient.setQueryData(["chatMessages", activeProjectId || "draft"], context.previousMessages);
      
      // 4. HANDLE KEY ERRORS GRACEFULLY
      if (err.message === "MISSING_KEY") {
        alert("Please click the Settings gear icon and enter your NVIDIA API Key.");
      } else if (err.message === "INVALID_KEY") {
        alert("Your NVIDIA API Key is invalid or expired. Please check your Settings.");
      }
    },
  });

  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
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
  }, [messages.length, mutation.isPending, storyboardReady]);

  // ==========================================
  // DYNAMIC WORKFLOW DETECTOR
  // ==========================================
  const lastMsgText = messages[messages.length - 1]?.content.toLowerCase() || "";
  
  const isSatisfactoryQuestion = !mutation.isPending && messages[messages.length - 1]?.role === "assistant" && lastMsgText.includes("satisfactory");
  const isReadyQuestion = !mutation.isPending && messages[messages.length - 1]?.role === "assistant" && lastMsgText.includes("ready");
  
  const isBinaryQuestion = isSatisfactoryQuestion || isReadyQuestion;

  if (isProjectLoading) {
    return <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden">Loading...</div>
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative">

      {onExpand && (
        <button 
          onClick={onExpand}
          className="absolute top-4 right-4 z-20 p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/50 rounded-lg shadow-sm backdrop-blur-md transition-all"
          title={isExpanded ? "Split View" : "Full Screen Chat"}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      )}
      
      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-5 sm:space-y-6 custom-scrollbar scroll-smooth relative pb-10">
        
        {messages.length === 0 && !mutation.isPending && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-800">
              <Bot className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Director's Terminal</h3>
            <p className="text-sm text-center max-w-xs text-zinc-500">I will guide you step-by-step to create your storyboard. What is the concept for your video?</p>
          </div>
        )}
        
        {messages.map((msg, index) => <ChatMessage key={msg._id || msg.timestamp || index} msg={msg} />)}
        {mutation.isPending && <TypingIndicator />}
        
        {storyboardReady && !mutation.isPending && (
          <div className="flex justify-center mt-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <button 
              onClick={onMinimize}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl shadow-[0_0_30px_-5px_rgba(99,102,241,0.5)] transition-all font-bold group"
            >
              <LayoutTemplate className="w-5 h-5" />
              Minimize Chat & View Canvas
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4 w-full" />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 min-h-[80px] flex flex-col justify-end transition-all duration-300">
        
        {isBinaryQuestion && !wantsToAdjust && (
          <div className="flex flex-col gap-3 w-full animate-in slide-in-from-bottom-2 fade-in">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">Action Required</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button 
                onClick={() => handleSend(undefined, isReadyQuestion ? "Yes, I am ready. Generate the final storyboard." : "Yes, the script is satisfactory. Proceed.")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
              >
                <Check className="w-4 h-4" /> 
                {isReadyQuestion ? "Yes, generate storyboard" : "Yes, script is perfect"}
              </button>
              <button 
                onClick={() => {
                  setWantsToAdjust(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-xl text-sm font-medium transition-all"
              >
                <Edit3 className="w-4 h-4" /> No, let's adjust
              </button>
            </div>
          </div>
        )}

        {(!isBinaryQuestion || wantsToAdjust) && (
          <div className="w-full animate-in fade-in duration-300">
            {imageBase64 && (
              <div className="mb-3 relative inline-block animate-in zoom-in-95 duration-200">
                <img src={imageBase64} alt="Upload preview" className="h-16 sm:h-20 rounded-lg border-2 border-zinc-700 object-cover shadow-lg" />
                <button onClick={() => setImageBase64(null)} className="absolute -top-2 -right-2 bg-zinc-800 border border-zinc-600 rounded-full p-1 hover:bg-zinc-700 transition-colors shadow-md">
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-300" />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="relative flex items-end bg-zinc-900 border border-zinc-700/60 rounded-[20px] px-2 py-2 shadow-inner focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-300">
              
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 sm:p-2.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-full transition-colors shrink-0 mb-0.5">
                <ImageIcon className="w-5 h-5" />
              </button>
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Type your concept or reply..."
                className="flex-1 bg-transparent border-none outline-none px-2 sm:px-3 py-2.5 sm:py-3 text-[15px] text-zinc-100 placeholder:text-zinc-500 resize-none min-h-[44px] max-h-[200px] overflow-y-auto custom-scrollbar"
                rows={1}
              />
              
              <button 
                type="submit" 
                disabled={(!input.trim() && !imageBase64) || mutation.isPending} 
                className="p-2 sm:p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shrink-0 mb-0.5 shadow-md"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-2">
                <span className="text-[10px] text-zinc-500 font-medium tracking-wide">Press Enter to send, Shift + Enter for new line</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}