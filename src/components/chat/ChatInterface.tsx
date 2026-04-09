"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Send, Loader2, Bot, User, X } from "lucide-react";

type Message = { id: string; role: "user" | "assistant"; content: string; isOptimistic?: boolean };

// ... (Keep your ChatMessage component exactly the same here) ...
const ChatMessage = memo(function ChatMessage({ msg }: { msg: Message }) {
  return (
    <div className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""} ${msg.isOptimistic ? "opacity-70" : "opacity-100"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md ${msg.role === "user" ? "bg-indigo-600" : "bg-zinc-800"}`}>
        {msg.role === "user" ? <User className="w-5 h-5 text-indigo-100" /> : <Bot className="w-5 h-5 text-zinc-300" />}
      </div>
      <div className={`max-w-[75%] px-4 py-3 rounded-[20px] shadow-sm ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700/60"}`}>
        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
      </div>
    </div>
  );
});

type ChatInterfaceProps = {
  activeProjectId: string | null;
  onProjectCreated: (id: string) => void;
};

export default function ChatInterface({ activeProjectId, onProjectCreated }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null); // Track the active project
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Get current messages from cache
  const messages = queryClient.getQueryData<Message[]>(["chatMessages"]) || [];

  // Handle Image Upload -> Convert to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: async (newMsg: Message) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            content: newMsg.content, 
            imageBase64, 
            projectId 
        }),
      });
      if (!response.ok) throw new Error("API Request Failed");
      return response.json();
    },
    onMutate: async (newMsg) => {
      await queryClient.cancelQueries({ queryKey: ["chatMessages"] });
      const previousMessages = queryClient.getQueryData<Message[]>(["chatMessages"]);
      queryClient.setQueryData<Message[]>(["chatMessages"], (old = []) => [...old, { ...newMsg, isOptimistic: true }]);
      setImageBase64(null); // Clear image preview immediately
      return { previousMessages };
    },
    onSuccess: (data) => {
      
      if (data.projectId && !activeProjectId) {
         setProjectId(data.projectId);
         onProjectCreated(data.projectId); // Tell the parent page we have a new ID!
      }
      
      if (data.storyboard && data.storyboard.length > 0) {
        queryClient.setQueryData(["projectData", data.projectId], { storyboard: data.storyboard });
      }
      
      // 3. Update the chat messages cache
      queryClient.setQueryData<Message[]>(["chatMessages"], (old = []) => {
        const withoutOptimistic = old.filter((m) => !m.isOptimistic);
        return [...withoutOptimistic, { id: Date.now().toString(), role: "assistant", content: data.message.content }];
      });
    },
    onError: (err, newTodo, context) => {
      if (context?.previousMessages) queryClient.setQueryData(["chatMessages"], context.previousMessages);
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageBase64) return;

    mutation.mutate({ id: Math.random().toString(), role: "user", content: input });
    setInput("");
  };

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length, mutation.isPending]);

  // 1. Fetch the project data (Chat History)
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ["projectData", activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const res = await fetch(`/api/projects/${activeProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!activeProjectId, // Only fetch if we clicked a past project
  });

  // 2. Map the database history to your UI format, or default to empty array if new project
  const displayMessages = project?.chatHistory || [];

  // 3. SHOW LOADING STATE
  if (isProjectLoading) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
           <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
           <span className="text-zinc-400 font-medium">Restoring Session...</span>
        </div>
        <div className="space-y-6 flex-1">
          {/* Chat Bubble Skeletons */}
          <div className="w-3/4 h-20 bg-zinc-900 rounded-2xl rounded-tl-sm animate-pulse" />
          <div className="w-2/3 h-16 bg-indigo-900/20 self-end ml-auto rounded-2xl rounded-tr-sm animate-pulse" />
          <div className="w-full h-32 bg-zinc-900 rounded-2xl rounded-tl-sm animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !mutation.isPending && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Start a conversation to generate your storyboard.</p>
          </div>
        )}
        
        {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}
        
        {mutation.isPending && (
           <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="w-10 h-10 rounded-full bg-zinc-800 shadow-md flex items-center justify-center shrink-0 border border-zinc-700/50">
               <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
             </div>
             <div className="bg-zinc-800/50 text-zinc-400 px-4 py-3 rounded-[20px] rounded-tl-sm border border-zinc-700/30">
                <span className="text-sm italic">Directing...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-px w-full" />
      </div>

      <div className="p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800">
        {/* Image Preview Area */}
        {imageBase64 && (
          <div className="mb-3 relative inline-block">
            <img src={imageBase64} alt="Upload preview" className="h-20 rounded-md border border-zinc-700 object-cover" />
            <button onClick={() => setImageBase64(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="relative flex items-center bg-zinc-900 border border-zinc-700/80 rounded-full px-2 py-2 shadow-lg">
          {/* Hidden File Input */}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-400 hover:text-zinc-100 transition-colors">
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your instruction or upload an image..."
            className="flex-1 bg-transparent border-none outline-none px-3 text-zinc-100 placeholder:text-zinc-500"
          />
          
          <button type="submit" disabled={(!input.trim() && !imageBase64) || mutation.isPending} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 transition-all">
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}