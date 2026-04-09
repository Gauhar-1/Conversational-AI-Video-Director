"use client";

import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import StoryboardCanvas from "@/components/storyboard/StoryboardGrid"; // Assuming you are using the Canvas now!
import HistorySidebar from "@/components/sidebar/HistorySideBar";
import { Menu } from "lucide-react";

export default function Home() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    // 1. Removed h-screen here since the layout.tsx body handles it now. Just use h-full.
    <main className="flex h-full w-full relative overflow-auto">
      
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none -z-10" />
      
      {/* 1. History Sidebar */}
      <aside 
        className={`${isSidebarOpen ? "w-72" : "w-0"} flex-shrink-0 h-full flex flex-col overflow-hidden transition-all duration-300 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl z-20`}
      >
        {/* Added flex flex-col here to ensure the inner content doesn't push upwards */}
        <div className="w-72 h-full flex flex-col overflow-hidden">
          <HistorySidebar 
            activeProjectId={activeProjectId} 
            onSelectProject={setActiveProjectId} 
            isOpen={isSidebarOpen}
          />
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0 z-10">
        
        {/* Header */}
        <header className="h-16 flex-shrink-0 border-b border-zinc-800/50 flex items-center px-6 bg-zinc-950/50 backdrop-blur-md">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-400 hover:text-white transition-colors mr-4 rounded-md hover:bg-zinc-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Director AI.
          </h1>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Left Chat Column */}
          <section className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 h-full flex flex-col overflow-hidden">
             <ChatInterface 
                activeProjectId={activeProjectId} 
                onProjectCreated={setActiveProjectId} 
             />
          </section>

          {/* Right Storyboard Column */}
          <section className="hidden lg:flex flex-1 h-full flex-col overflow-hidden min-w-[400px]">
            {/* Note: I swapped this to StoryboardCanvas based on our previous step! */}
            <StoryboardCanvas activeProjectId={activeProjectId} />
          </section>

        </div>
      </div>
    </main>
  );
}