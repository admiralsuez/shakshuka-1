"use client";

import { useState, useEffect, useRef } from "react";
import { Counters } from "@/components/widgets/Counters";
import { Tasks } from "@/components/tasks/Tasks";
import { PomodoroTimer } from "@/components/widgets/PomodoroTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, LayoutList, X } from "lucide-react";
import { loadSettings, saveSettings, loadStrikes, formatDateInTZ, isTauri } from "@/lib/local-storage";
import { getQuirkyNickname, getGreeting } from "@/lib/quirky-nicknames";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useRouter } from "next/navigation";
import { readTextFile, writeTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";

// Dashboard widget types
type DashboardWidget = {
  type: string;
  title: string;
};

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  dueHour?: number;
}

const TASKS_FILE = "tasks.json";

async function loadTasks(): Promise<Task[]> {
  try {
    if (await isTauri()) {
      const ok = await exists(TASKS_FILE, { baseDir: BaseDirectory.App });
      if (!ok) return [];
      const txt = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.App });
      const data = JSON.parse(txt);
      return Array.isArray(data) ? (data as Task[]) : [];
    }
    const res = await fetch("/api/tasks");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as Task[]) : [];
  } catch {
    return [];
  }
}

async function loadDashboardWidgets(): Promise<DashboardWidget[]> {
  try {
    if (await isTauri()) {
      const ok = await exists("dashboard-widgets.json", { baseDir: BaseDirectory.App });
      if (!ok) return [];
      const txt = await readTextFile("dashboard-widgets.json", { baseDir: BaseDirectory.App });
      return JSON.parse(txt);
    }
    const raw = localStorage.getItem("dashboard-widgets");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveDashboardWidgets(widgets: DashboardWidget[]): Promise<void> {
  try {
    if (await isTauri()) {
      await writeTextFile("dashboard-widgets.json", JSON.stringify(widgets, null, 2), { baseDir: BaseDirectory.App });
    } else {
      localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
    }
  } catch (error) {
    console.error("Failed to save dashboard widgets:", error);
  }
}

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"relaxed" | "compact">("relaxed");
  const [displayName, setDisplayName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [showPomodoro, setShowPomodoro] = useState(true);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [widgetStats, setWidgetStats] = useState<Record<string, number>>({});
  const tasksRef = useRef<{ openAddDialog: () => void } | null>(null);
  const router = useRouter();

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    n: () => {
      tasksRef.current?.openAddDialog();
    },
    p: () => {
      router.push("/planner");
    }
  });

  useEffect(() => {
    let mounted = true;
    
    const loadGreeting = async () => {
      const settings = await loadSettings();
      
      if (!mounted) return;
      
      setShowPomodoro(settings.showPomodoroTimer !== false);
      
      let name = "";
      if (settings.userName?.trim()) {
        name = settings.userName.trim();
      } else {
        const { nickname, index } = getQuirkyNickname(settings.quirkyNicknameIndex);
        name = nickname;
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

  // Load widgets and calculate stats
  useEffect(() => {
    let mounted = true;
    
    const loadWidgetsAndStats = async () => {
      const [loadedWidgets, settings, strikes, tasks] = await Promise.all([
        loadDashboardWidgets(),
        loadSettings(),
        loadStrikes(),
        loadTasks()
      ]);
      
      if (!mounted) return;
      
      setWidgets(loadedWidgets);
      
      // Calculate stats for each widget type
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", { 
        timeZone: settings.timezone, 
        year: "numeric", 
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        hour12: false 
      }).formatToParts(now);
      
      let y = parseInt(parts.find(p => p.type === "year")?.value || "0");
      let m = parseInt(parts.find(p => p.type === "month")?.value || "1");
      const d = parseInt(parts.find(p => p.type === "day")?.value || "1");
      const h = parseInt(parts.find(p => p.type === "hour")?.value || "0");
      
      if (d === 1 && h < settings.resetHour) {
        m = m === 1 ? 12 : m - 1;
        if (m === 12) y -= 1;
      }
      
      const monthKey = `${y}-${String(m).padStart(2, "0")}`;
      const inMonth = (dateStr: string) => dateStr.slice(0, 7) === monthKey;
      
      const stats: Record<string, number> = {
        "month-strikes": strikes.filter(s => s.action === "strike" && inMonth(s.date)).length,
        "month-completed": strikes.filter(s => s.action === "completed" && inMonth(s.date)).length,
        "month-expired": strikes.filter(s => s.action === "expired" && inMonth(s.date)).length,
        "month-tasks-added": tasks.filter(t => inMonth(formatDateInTZ(t.createdAt, settings.timezone))).length,
        "total-tasks": tasks.length,
        "total-strikes": strikes.filter(s => s.action === "strike").length,
        "total-completed": strikes.filter(s => s.action === "completed").length,
      };
      
      setWidgetStats(stats);
    };
    
    loadWidgetsAndStats();
    
    return () => {
      mounted = false;
    };
  }, []);

  const removeWidget = async (widgetType: string) => {
    const updated = widgets.filter(w => w.type !== widgetType);
    setWidgets(updated);
    await saveDashboardWidgets(updated);
    toast.success("Widget removed from homepage");
  };

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

      {/* Custom Widgets from Reports */}
      {widgets.length > 0 && (
        <section className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
          style={{
            background: 'linear-gradient(to bottom right, oklch(0.8 0.2 140 / 0.1), oklch(0.74 0.2 310 / 0.1), oklch(0.66 0.2 250 / 0.1))'
          }}
        >
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.8 0.2 140)' }} />
            My Widgets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {widgets.map((widget) => (
              <Card key={widget.type}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm text-muted-foreground flex-1">{widget.title}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeWidget(widget.type)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    {widgetStats[widget.type] ?? 0}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

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