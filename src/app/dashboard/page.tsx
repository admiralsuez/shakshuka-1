"use client";

import { useState, useEffect, useRef } from "react";
import { Counters } from "@/components/widgets/Counters";
import { Tasks } from "@/components/tasks/Tasks";
import { PomodoroTimer } from "@/components/widgets/PomodoroTimer";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";
import { loadSettings, saveSettings } from "@/lib/local-storage";
import { getQuirkyNickname, getGreeting } from "@/lib/quirky-nicknames";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"relaxed" | "compact">("relaxed");
  const [displayName, setDisplayName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [showPomodoro, setShowPomodoro] = useState(true);
  const tasksRef = useRef<{ openAddDialog: () => void } | null>(null);
  const router = useRouter();

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    n: () => {
      // Open new task dialog
      tasksRef.current?.openAddDialog();
    },
    p: () => {
      // Navigate to planner
      router.push("/planner");
    }
  });

  useEffect(() => {
    let mounted = true;
    
    const loadGreeting = async () => {
      const settings = await loadSettings();
      
      if (!mounted) return;
      
      // Check pomodoro timer visibility
      setShowPomodoro(settings.showPomodoroTimer !== false);
      
      // Determine display name
      let name = "";
      if (settings.userName?.trim()) {
        name = settings.userName.trim();
      } else {
        // Use quirky nickname
        const { nickname, index } = getQuirkyNickname(settings.quirkyNicknameIndex);
        name = nickname;
        
        // Save the new index for next time
        await saveSettings({ ...settings, quirkyNicknameIndex: index });
      }
      
      setDisplayName(name);
      setGreeting(getGreeting());
    };
    
    loadGreeting();
    
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-5xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
      {/* decorative gradients */}
      <div 
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-2xl" 
        style={{
          background: 'radial-gradient(closest-side, oklch(0.66 0.2 250 / 0.25), transparent)'
        }}
      />
      <div 
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-2xl" 
        style={{
          background: 'radial-gradient(closest-side, oklch(0.72 0.15 160 / 0.20), transparent)'
        }}
      />

      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 animate-in fade-in-50">
        <div className="space-y-1 flex-1 w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight break-words">
            <span style={{
              background: 'linear-gradient(to right, oklch(0.66 0.2 250), oklch(0.72 0.15 160), oklch(0.8 0.2 140))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              {greeting}{displayName && `, ${displayName}`}!
            </span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Track your daily strikes, monitor progress, and manage tasks.
            <span className="ml-2 text-[10px] sm:text-xs opacity-70">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground border text-[9px] sm:text-[10px]">N</kbd> for new task, 
              <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-muted-foreground border text-[9px] sm:text-[10px]">P</kbd> for planner
            </span>
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
        style={{
          background: 'linear-gradient(to bottom right, oklch(0.66 0.2 250 / 0.1), oklch(0.7 0.11 35 / 0.1), oklch(0.8 0.2 140 / 0.1))'
        }}
      >
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.66 0.2 250)' }} />
          Quick stats
        </h2>
        <Counters />
      </section>

      <section className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
        style={{
          background: 'linear-gradient(to bottom right, oklch(0.74 0.2 310 / 0.1), oklch(0.72 0.15 160 / 0.1), oklch(0.7 0.11 35 / 0.1))'
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
          {showPomodoro && <PomodoroTimer mini />}
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            <Button
              size="sm"
              variant={viewMode === "relaxed" ? "secondary" : "ghost"}
              onClick={() => setViewMode("relaxed")}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label="Relaxed view"
            >
              <LayoutList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "compact" ? "secondary" : "ghost"}
              onClick={() => setViewMode("compact")}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label="Compact view"
            >
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
        <Tasks ref={tasksRef} compact={viewMode === "compact"} />
      </section>
    </div>
  );
}