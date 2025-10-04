// ============================================================================
// DASHBOARD PAGE - Main landing page after login
// ============================================================================
// This page serves as the central hub for the application, displaying:
// - Personalized greeting with user's name or quirky nickname
// - Quick stats (counters for strikes/tasks)
// - Custom widgets added from Reports page
// - Pomodoro timer (optional)
// - Task list with compact/relaxed view modes
// - Keyboard shortcuts for quick navigation (N = new task, P = planner)
// ============================================================================

"use client";

// ============================================================================
// IMPORTS
// ============================================================================

// React core imports
import { useState, useEffect, useRef } from "react";

// Next.js imports
import { useRouter } from "next/navigation";

// Tauri desktop app imports (file system operations)
import { readTextFile, writeTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";

// UI component imports
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, LayoutList, X } from "lucide-react";

// Feature component imports
import { Counters } from "@/components/widgets/Counters";
import { Tasks } from "@/components/tasks/Tasks";
import { PomodoroTimer } from "@/components/widgets/PomodoroTimer";

// Utility imports
import { 
  loadSettings, 
  saveSettings, 
  loadStrikes, 
  formatDateInTZ, 
  isTauri 
} from "@/lib/local-storage";
import { getQuirkyNickname, getGreeting } from "@/lib/quirky-nicknames";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { toast } from "sonner";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a custom widget added from the Reports page
 * These widgets display statistical metrics on the dashboard
 */
type DashboardWidget = {
  type: string;   // Unique identifier (e.g., "month-strikes", "total-tasks")
  title: string;  // Display title shown in the UI
};

/**
 * Task data structure
 * Used for calculating task-related statistics in widgets
 */
interface Task {
  id: string;           // Unique task identifier
  title: string;        // Task description
  completed: boolean;   // Completion status
  createdAt: number;    // Creation timestamp (Unix epoch)
  dueHour?: number;     // Optional: hour of day task is due (0-23)
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * File name for storing tasks in Tauri desktop app
 * Location: AppData directory
 */
const TASKS_FILE = "tasks.json";

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

/**
 * Load tasks from storage (Tauri file system or web API)
 * @returns Promise<Task[]> - Array of all tasks
 * 
 * Flow:
 * 1. Check if running in Tauri desktop app
 * 2. If Tauri: Read from AppData/tasks.json
 * 3. If Web: Fetch from /api/tasks endpoint
 * 4. Return parsed task array or empty array on error
 */
async function loadTasks(): Promise<Task[]> {
  try {
    // Desktop app path: Read from local file system
    if (await isTauri()) {
      const ok = await exists(TASKS_FILE, { baseDir: BaseDirectory.AppData });
      if (!ok) return []; // File doesn't exist yet
      
      const txt = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.AppData });
      const data = JSON.parse(txt);
      return Array.isArray(data) ? (data as Task[]) : [];
    }
    
    // Web app path: Fetch from API endpoint
    const res = await fetch("/api/tasks");
    if (!res.ok) return [];
    
    const data = await res.json();
    return Array.isArray(data) ? (data as Task[]) : [];
  } catch {
    // Catch any errors (parsing, network, etc.) and return empty array
    return [];
  }
}

/**
 * Load dashboard widgets configuration
 * @returns Promise<DashboardWidget[]> - Array of widgets to display
 * 
 * Storage locations:
 * - Tauri: App/dashboard-widgets.json
 * - Web: localStorage key "dashboard-widgets"
 */
async function loadDashboardWidgets(): Promise<DashboardWidget[]> {
  try {
    // Desktop app path: Read from app data directory
    if (await isTauri()) {
      const ok = await exists("dashboard-widgets.json", { baseDir: BaseDirectory.App });
      if (!ok) return [];
      
      const txt = await readTextFile("dashboard-widgets.json", { baseDir: BaseDirectory.App });
      return JSON.parse(txt);
    }
    
    // Web app path: Read from localStorage
    const raw = localStorage.getItem("dashboard-widgets");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save dashboard widgets configuration
 * @param widgets - Array of widgets to save
 * 
 * Storage locations:
 * - Tauri: App/dashboard-widgets.json
 * - Web: localStorage key "dashboard-widgets"
 */
async function saveDashboardWidgets(widgets: DashboardWidget[]): Promise<void> {
  try {
    // Desktop app path: Write to app data directory
    if (await isTauri()) {
      await writeTextFile(
        "dashboard-widgets.json", 
        JSON.stringify(widgets, null, 2), 
        { baseDir: BaseDirectory.App }
      );
    } else {
      // Web app path: Write to localStorage
      localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
    }
  } catch (error) {
    console.error("Failed to save dashboard widgets:", error);
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  /**
   * View mode for task list
   * - "relaxed": Larger spacing, more details visible
   * - "compact": Tighter spacing, more tasks visible at once
   */
  const [viewMode, setViewMode] = useState<"relaxed" | "compact">("relaxed");
  
  /**
   * User's display name (custom name or quirky nickname)
   * Shown in the greeting header
   */
  const [displayName, setDisplayName] = useState<string>("");
  
  /**
   * Time-based greeting message
   * e.g., "Good morning", "Good afternoon", "Good evening"
   */
  const [greeting, setGreeting] = useState<string>("");
  
  /**
   * Whether to show the Pomodoro timer widget
   * Controlled by user settings
   */
  const [showPomodoro, setShowPomodoro] = useState(true);
  
  /**
   * Custom widgets added from Reports page
   * Each widget displays a specific metric (strikes, tasks, etc.)
   */
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  
  /**
   * Calculated statistics for each widget type
   * Key: widget type (e.g., "month-strikes")
   * Value: numeric count
   */
  const [widgetStats, setWidgetStats] = useState<Record<string, number>>({});
  
  // ==========================================================================
  // REFS
  // ==========================================================================
  
  /**
   * Reference to Tasks component
   * Used to programmatically trigger "Add Task" dialog via keyboard shortcut
   */
  const tasksRef = useRef<{ openAddDialog: () => void } | null>(null);
  
  // ==========================================================================
  // HOOKS
  // ==========================================================================
  
  const router = useRouter();

  /**
   * Keyboard shortcuts setup
   * N: Open new task dialog
   * P: Navigate to planner page
   */
  useKeyboardShortcuts({
    n: () => {
      tasksRef.current?.openAddDialog();
    },
    p: () => {
      router.push("/planner");
    }
  });

  // ==========================================================================
  // EFFECT: Load user settings and greeting
  // ==========================================================================
  
  /**
   * Runs once on mount to:
   * 1. Load user settings (name, pomodoro visibility)
   * 2. Generate/load quirky nickname if no custom name set
   * 3. Generate time-based greeting
   */
  useEffect(() => {
    let mounted = true;
    
    const loadGreeting = async () => {
      const settings = await loadSettings();
      
      // Prevent state updates if component unmounted
      if (!mounted) return;
      
      // Set Pomodoro timer visibility from settings
      setShowPomodoro(settings.showPomodoroTimer !== false);
      
      // Determine display name: custom name or quirky nickname
      let name = "";
      if (settings.userName?.trim()) {
        // User has set a custom name
        name = settings.userName.trim();
      } else {
        // Generate a quirky nickname
        const { nickname, index } = getQuirkyNickname(settings.quirkyNicknameIndex);
        name = nickname;
        
        // Save the nickname index to cycle through different names
        await saveSettings({ ...settings, quirkyNicknameIndex: index });
      }
      
      setDisplayName(name);
      setGreeting(getGreeting()); // e.g., "Good morning"
    };
    
    loadGreeting();
    
    // Cleanup: prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================================
  // EFFECT: Load widgets and calculate statistics
  // ==========================================================================
  
  /**
   * Runs once on mount to:
   * 1. Load custom widgets configuration
   * 2. Load all necessary data (settings, strikes, tasks)
   * 3. Calculate statistics for each widget type
   * 
   * Statistics calculated:
   * - month-strikes: Strikes received this month
   * - month-completed: Tasks completed this month
   * - month-expired: Tasks expired this month
   * - month-tasks-added: Tasks created this month
   * - total-tasks: All-time task count
   * - total-strikes: All-time strike count
   * - total-completed: All-time completed task count
   */
  useEffect(() => {
    let mounted = true;
    
    const loadWidgetsAndStats = async () => {
      // Load all data in parallel for performance
      const [loadedWidgets, settings, strikes, tasks] = await Promise.all([
        loadDashboardWidgets(),
        loadSettings(),
        loadStrikes(),
        loadTasks()
      ]);
      
      // Prevent state updates if component unmounted
      if (!mounted) return;
      
      setWidgets(loadedWidgets);
      
      // ======================================================================
      // CALCULATE CURRENT MONTH IN USER'S TIMEZONE
      // ======================================================================
      
      const now = new Date();
      
      // Parse current date/time in user's timezone
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
      
      // Handle month boundary based on reset hour
      // If it's the 1st of the month before reset hour, use previous month
      if (d === 1 && h < settings.resetHour) {
        m = m === 1 ? 12 : m - 1;
        if (m === 12) y -= 1; // Handle year boundary
      }
      
      // Format as YYYY-MM for comparison
      const monthKey = `${y}-${String(m).padStart(2, "0")}`;
      
      // Helper function to check if a date string is in current month
      const inMonth = (dateStr: string) => dateStr.slice(0, 7) === monthKey;
      
      // ======================================================================
      // CALCULATE STATISTICS FOR EACH WIDGET TYPE
      // ======================================================================
      
      const stats: Record<string, number> = {
        // Monthly statistics
        "month-strikes": strikes.filter(s => 
          s.action === "strike" && inMonth(s.date)
        ).length,
        
        "month-completed": strikes.filter(s => 
          s.action === "completed" && inMonth(s.date)
        ).length,
        
        "month-expired": strikes.filter(s => 
          s.action === "expired" && inMonth(s.date)
        ).length,
        
        "month-tasks-added": tasks.filter(t => 
          inMonth(formatDateInTZ(t.createdAt, settings.timezone))
        ).length,
        
        // All-time statistics
        "total-tasks": tasks.length,
        
        "total-strikes": strikes.filter(s => 
          s.action === "strike"
        ).length,
        
        "total-completed": strikes.filter(s => 
          s.action === "completed"
        ).length,
      };
      
      setWidgetStats(stats);
    };
    
    loadWidgetsAndStats();
    
    // Cleanup: prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================
  
  /**
   * Remove a widget from the dashboard
   * @param widgetType - The type identifier of the widget to remove
   * 
   * Flow:
   * 1. Filter out the widget from state
   * 2. Save updated widget list to storage
   * 3. Show success notification
   */
  const removeWidget = async (widgetType: string) => {
    const updated = widgets.filter(w => w.type !== widgetType);
    setWidgets(updated);
    await saveDashboardWidgets(updated);
    toast.success("Widget removed from homepage");
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <div className="relative mx-auto w-full max-w-5xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
      
      {/* ================================================================== */}
      {/* DECORATIVE GRADIENTS (Background effects) */}
      {/* ================================================================== */}
      
      {/* Top-left gradient - Purple/Blue */}
      <div 
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-2xl" 
        style={{
          background: 'radial-gradient(closest-side, oklch(0.66 0.2 250 / 0.25), transparent)'
        }}
      />
      
      {/* Bottom-right gradient - Green */}
      <div 
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-2xl" 
        style={{
          background: 'radial-gradient(closest-side, oklch(0.72 0.15 160 / 0.20), transparent)'
        }}
      />

      {/* ================================================================== */}
      {/* HEADER SECTION */}
      {/* Personalized greeting with keyboard shortcut hints */}
      {/* ================================================================== */}
      
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 animate-in fade-in-50">
        <div className="space-y-1 flex-1 w-full">
          {/* Greeting title with gradient text */}
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
          
          {/* Subtitle with keyboard shortcuts */}
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Track your daily strikes, monitor progress, and manage tasks.
            <span className="ml-2 text-[10px] sm:text-xs opacity-70">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground border text-[9px] sm:text-[10px]">N</kbd> for new task, 
              <kbd className="ml-1 px-1 py-0.5 rounded bg-muted text-muted-foreground border text-[9px] sm:text-[10px]">P</kbd> for planner
            </span>
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CUSTOM WIDGETS SECTION */}
      {/* Displays widgets added from Reports page (conditional render) */}
      {/* ================================================================== */}
      
      {widgets.length > 0 && (
        <section 
          className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
          style={{
            background: 'linear-gradient(to bottom right, oklch(0.8 0.2 140 / 0.1), oklch(0.74 0.2 310 / 0.1), oklch(0.66 0.2 250 / 0.1))'
          }}
        >
          {/* Section header */}
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.8 0.2 140)' }} />
            My Widgets
          </h2>
          
          {/* Widget grid - responsive columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {widgets.map((widget) => (
              <Card key={widget.type}>
                <CardContent className="p-4">
                  {/* Widget header with remove button */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-sm text-muted-foreground flex-1">
                      {widget.title}
                    </div>
                    
                    {/* Remove widget button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeWidget(widget.type)}
                      aria-label={`Remove ${widget.title} widget`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  {/* Widget statistic value */}
                  <Badge variant="secondary" className="text-base">
                    {widgetStats[widget.type] ?? 0}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* QUICK STATS SECTION */}
      {/* Displays monthly/total counters for strikes and tasks */}
      {/* ================================================================== */}
      
      <section 
        className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
        style={{
          background: 'linear-gradient(to bottom right, oklch(0.66 0.2 250 / 0.1), oklch(0.7 0.11 35 / 0.1), oklch(0.8 0.2 140 / 0.1))'
        }}
      >
        {/* Section header */}
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.66 0.2 250)' }} />
          Quick stats
        </h2>
        
        {/* Counters component - displays strike/task statistics */}
        <Counters />
      </section>

      {/* ================================================================== */}
      {/* TASKS SECTION */}
      {/* Main task list with Pomodoro timer and view mode toggle */}
      {/* ================================================================== */}
      
      <section 
        className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
        style={{
          background: 'linear-gradient(to bottom right, oklch(0.74 0.2 310 / 0.1), oklch(0.72 0.15 160 / 0.1), oklch(0.7 0.11 35 / 0.1))'
        }}
      >
        {/* Section header with Pomodoro timer and view toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
          
          {/* Pomodoro timer (conditional) */}
          {showPomodoro && <PomodoroTimer mini />}
          
          {/* View mode toggle buttons */}
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            {/* Relaxed view button */}
            <Button
              size="sm"
              variant={viewMode === "relaxed" ? "secondary" : "ghost"}
              onClick={() => setViewMode("relaxed")}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
              aria-label="Relaxed view"
            >
              <LayoutList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            
            {/* Compact view button */}
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
        
        {/* Tasks list component */}
        <Tasks ref={tasksRef} compact={viewMode === "compact"} />
      </section>
    </div>
  );
}