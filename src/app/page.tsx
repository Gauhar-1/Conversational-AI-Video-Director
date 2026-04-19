"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import StoryboardCanvas from "@/components/storyboard/StoryboardGrid"; 
import HistorySidebar from "@/components/sidebar/HistorySideBar";
import { Menu, MessageSquare, Minimize2 } from "lucide-react"; 

export default function Home() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'chat-only' | 'storyboard-only'>('split');

  const handleProjectSelect = (id: string | null) => {
    setActiveProjectId(id);
    if (id) localStorage.setItem("director_active_project", id);
    else localStorage.removeItem("director_active_project");
  };

  // NEW: Centralized Layout Controller
  const handleViewModeChange = (newMode: 'split' | 'chat-only' | 'storyboard-only') => {
    setViewMode(newMode);
    
    // Automatically manage the sidebar for maximum screen real estate!
    if (newMode === 'split') {
      setIsSidebarOpen(true); // Bring sidebar back smoothly
    } else {
      setIsSidebarOpen(false); // Hide sidebar smoothly when entering full screen
    }
  };

  useEffect(() => {
    handleViewModeChange('split');
  }, [activeProjectId]);

  return (
    <main className="flex h-full w-full relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none -z-10" />
      
      {/* History Sidebar */}
      <aside 
        className={`${isSidebarOpen ? "w-72" : "w-0"} flex-shrink-0 h-full flex flex-col overflow-hidden transition-all duration-[700ms] ease-[cubic-bezier(0.23,1,0.32,1)] border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl z-20`}
      >
        <div className={`w-72 h-full flex flex-col transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none'}`}>
          <HistorySidebar activeProjectId={activeProjectId} onSelectProject={handleProjectSelect} isOpen={isSidebarOpen} />
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 z-10 relative">
        
        {/* Header */}
        <header className="h-16 min-h-[64px] flex-shrink-0 border-b border-zinc-800/50 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-20">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-zinc-400 hover:text-white transition-colors mr-4 rounded-md hover:bg-zinc-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Director AI.
            </h1>
          </div>

          {/* Dynamic Recovery Buttons */}
          <div className="flex items-center gap-3">
            {viewMode === 'storyboard-only' && (
              <button 
                onClick={() => handleViewModeChange('split')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-full text-sm font-medium transition-all animate-in fade-in zoom-in duration-300"
              >
                <MessageSquare className="w-4 h-4" />
                Open Assistant
              </button>
            )}
            {viewMode === 'chat-only' && (
              <button 
                onClick={() => handleViewModeChange('split')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-full text-sm font-medium transition-all animate-in fade-in zoom-in duration-300"
              >
                <Minimize2 className="w-4 h-4" />
                Split View
              </button>
            )}
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 w-full min-h-0 overflow-hidden p-4 md:p-6 flex flex-col lg:flex-row relative">
          
          {/* Left Chat Column */}
          <section 
            className={`h-full flex flex-col overflow-hidden transition-all duration-[700ms] ease-[cubic-bezier(0.23,1,0.32,1)] origin-left flex-shrink-0 ${
              viewMode === 'storyboard-only' 
                ? "w-0 min-w-0 opacity-0 scale-95 mr-0 pointer-events-none" 
                : viewMode === 'chat-only'
                ? "w-full min-w-full opacity-100 scale-100 mr-0"
                : "w-full lg:w-[400px] xl:w-[450px] opacity-100 scale-100 mr-6"
            }`}
          >
             <div className={`${viewMode === 'chat-only' ? 'w-full max-w-4xl mx-auto' : 'w-full lg:w-[400px] xl:w-[450px]'} h-full flex flex-col transition-all duration-700`}>
               <ChatInterface 
                 activeProjectId={activeProjectId} 
                 onProjectCreated={setActiveProjectId} 
                 onMinimize={() => handleViewModeChange('storyboard-only')}
                 onExpand={() => handleViewModeChange(viewMode === 'chat-only' ? 'split' : 'chat-only')}
                 isExpanded={viewMode === 'chat-only'}
               />
             </div>
          </section>

          {/* Right Storyboard Column */}
          <section 
            className={`hidden lg:flex h-full flex-col overflow-hidden transition-all duration-[700ms] ease-[cubic-bezier(0.23,1,0.32,1)] origin-right ${
              viewMode === 'chat-only'
                ? "w-0 min-w-0 flex-none opacity-0 scale-95 pointer-events-none"
                : "flex-1 min-w-[400px] opacity-100 scale-100"
            }`}
          >
            {/* The Storyboard Canvas now acts exactly like the ChatInterface */}
            <div className="w-full h-full min-w-[400px]">
              <StoryboardCanvas 
                activeProjectId={activeProjectId} 
                isExpanded={viewMode === 'storyboard-only'}
                onExpand={() => handleViewModeChange(viewMode === 'storyboard-only' ? 'split' : 'storyboard-only')}
              />
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}