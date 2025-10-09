"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { readTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import type { Task } from "@/components/tasks/Tasks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tauri detection
async function isTauri(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

const TASKS_FILE = "tasks.json";

async function fetchTasksTauri(): Promise<Task[]> {
  try {
    const available = await isTauri();
    if (!available) return [];
    const fileExists = await exists(TASKS_FILE, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return [];
    const text = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.AppData });
    const data = JSON.parse(text);
    return Array.isArray(data) ? (data as Task[]) : [];
  } catch {
    return [];
  }
}

async function fetchTasksAPI(): Promise<Task[]> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
    const res = await fetch("/api/tasks", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      console.warn(`API fetch failed: ${res.status} ${res.statusText}`);
      // Try localStorage fallback
      if (typeof window !== "undefined") {
        const backup = localStorage.getItem("tasks_backup");
        if (backup) {
          console.log("📦 Loading tasks from localStorage backup (planner)");
          const data = JSON.parse(backup);
          return Array.isArray(data) ? data as Task[] : [];
        }
      }
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    
    // Save successful API data to localStorage as backup
    if (typeof window !== "undefined") {
      localStorage.setItem("tasks_backup", JSON.stringify(data));
    }
    
    return data as Task[];
  } catch (error) {
    console.error("API fetch error:", error);
    // Try localStorage fallback
    if (typeof window !== "undefined") {
      try {
        const backup = localStorage.getItem("tasks_backup");
        if (backup) {
          console.log("📦 Loading tasks from localStorage backup (planner - API error)");
          const data = JSON.parse(backup);
          return Array.isArray(data) ? data as Task[] : [];
        }
      } catch (localError) {
        console.error("Failed to parse localStorage backup:", localError);
      }
    }
    return [];
  }
}

type ScheduledTask = {
  id: string;
  title: string;
  hour: number; // 0-23
  minute: number; // 0 or 30
  date: string; // YYYY-MM-DD format
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

type ContextMenu = {
  x: number;
  y: number;
  scheduledIndex: number;
};

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];

// Helper to check if task extends past midnight
const checkExtendsPastMidnight = (hour: number, minute: number, durationMinutes: number) => {
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + durationMinutes;
  return endMinutes >= 24 * 60; // Past midnight
};

// Generate hourly slots from 12 AM (midnight) to 11 PM
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

// Helper to get date string
const getDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper to format date label
const formatDateLabel = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  }
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export const PlannerClient = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledTask[]>([]);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ hour: number; minute: number; date: string } | null>(null);
  const [isDraggingOverSchedule, setIsDraggingOverSchedule] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [currentDay, setCurrentDay] = useState(0);
  const [midnightDialog, setMidnightDialog] = useState<{
    open: boolean;
    taskId: string;
    task: Task;
    startHour: number;
    startMinute: number;
    duration: number;
    date: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const currentDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + currentDay);
    return date;
  }, [currentDay]);

  const currentDateString = useMemo(() => getDateString(currentDate), [currentDate]);

  // Load tasks and scheduled data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("🔄 Loading tasks for planner...");
        const tauri = await isTauri();
        console.log("🔍 Tauri available:", tauri);
        
        const data = tauri ? await fetchTasksTauri() : await fetchTasksAPI();
        console.log("📋 Loaded tasks for planner:", data.length, "tasks");
        console.log("📋 Tasks:", data.map(t => ({ id: t.id, title: t.title, completed: t.completed })));
        
        // Filter out completed tasks
        const activeTasks = data.filter(t => !t.completed);
        setTasks(activeTasks);
        console.log("✅ Set active tasks:", activeTasks.length);

        // Load scheduled tasks from localStorage
        const stored = localStorage.getItem("planner_schedule");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setScheduled(parsed as ScheduledTask[]);
              console.log("📅 Loaded scheduled tasks:", parsed.length);
            }
          } catch (e) {
            console.error("❌ Failed to parse scheduled tasks", e);
          }
        } else {
          console.log("📅 No scheduled tasks found in localStorage");
        }
      } catch (error) {
        console.error("❌ Task loading error:", error);
        // Set empty tasks on error
        setTasks([]);
        setScheduled([]);
      }
    };
    
    loadData();
    
    // Listen for task updates from other components
    const handleTaskUpdate = () => {
      loadData();
    };
    
    window.addEventListener("strikes-updated", handleTaskUpdate);
    return () => window.removeEventListener("strikes-updated", handleTaskUpdate);
  }, []);

  // Save scheduled tasks to localStorage whenever they change
  useEffect(() => {
    if (scheduled.length > 0 || localStorage.getItem("planner_schedule")) {
      localStorage.setItem("planner_schedule", JSON.stringify(scheduled));
    }
  }, [scheduled]);

  // Auto-scroll to current time when viewing today
  useEffect(() => {
    if (currentDay === 0 && scheduleRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      setTimeout(() => {
        const hourElement = scheduleRef.current?.querySelector(`[data-hour="${currentHour}"]`);
        if (hourElement) {
          hourElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [currentDay]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // Scroll to top when changing days
  useEffect(() => {
    if (scheduleRef.current) {
      scheduleRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentDay]);

  const unscheduledTasks = useMemo(() => {
    console.log("🔍 Calculating unscheduled tasks:", {
      totalTasks: tasks.length,
      scheduledTasks: scheduled.length,
      currentDate: currentDateString,
      tasks: tasks.map(t => ({ id: t.id, title: t.title, completed: t.completed }))
    });
    
    const scheduledIds = new Set(
      scheduled
        .filter(s => s.date === currentDateString)
        .map(s => s.id)
    );
    
    const unscheduled = tasks.filter(t => !scheduledIds.has(t.id));
    console.log("📋 Unscheduled tasks:", unscheduled.length, unscheduled.map(t => t.title));
    
    return unscheduled;
  }, [tasks, scheduled, currentDateString]);

  const scheduledForCurrentDay = useMemo(() => {
    return scheduled.filter(s => s.date === currentDateString);
  }, [scheduled, currentDateString]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    console.log("🎯 Drag started for task:", taskId);
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.log("❌ Task not found:", taskId);
      return;
    }
    console.log("🎯 Dragged task found:", task.title);
    setDraggedTask(task);
    
    // Set drag data for better compatibility
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.dropEffect = "move";
    
    // Set drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = "0.5";
    dragImage.style.transform = "rotate(5deg)";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverSlot(null);
    setIsDraggingOverSchedule(false);
  };

  const handleDragOver = (e: React.DragEvent, hour: number, minute: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    console.log("🎯 Drag over slot:", hour, minute);
    setDragOverSlot({ hour, minute, date: currentDateString });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, hour: number, minute: number) => {
    e.preventDefault();
    console.log("🎯 Drop event:", hour, minute);
    
    if (!draggedTask) {
      console.log("❌ No dragged task found");
      return;
    }

    console.log("✅ Task found, scheduling:", draggedTask.title);

    // Check if default 30min extends past midnight
    if (checkExtendsPastMidnight(hour, minute, 30)) {
      setMidnightDialog({
        open: true,
        taskId: draggedTask.id,
        task: draggedTask,
        startHour: hour,
        startMinute: minute,
        duration: 30,
        date: currentDateString,
      });
    } else {
      const newScheduled: ScheduledTask = {
        id: draggedTask.id,
        title: draggedTask.title,
        hour,
        minute,
        date: currentDateString,
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setScheduled(prev => [...prev, newScheduled]);
      console.log("✅ Task scheduled successfully");
    }
    
    setDraggedTask(null);
    setDragOverSlot(null);
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, scheduledIndex: index });
  };

  const changeDuration = (index: number, newDuration: number) => {
    const scheduledTask = scheduled[index];
    if (!scheduledTask) return;

    // Check if new duration extends past midnight
    if (checkExtendsPastMidnight(scheduledTask.hour, scheduledTask.minute, newDuration)) {
      setMidnightDialog({
        open: true,
        taskId: scheduledTask.id,
        task: { id: scheduledTask.id, title: scheduledTask.title } as Task,
        startHour: scheduledTask.hour,
        startMinute: scheduledTask.minute,
        duration: newDuration,
        date: scheduledTask.date,
      });
    } else {
      setScheduled(prev =>
        prev.map((s, i) => (i === index ? { ...s } : s))
      );
    }
    setContextMenu(null);
  };

  const removeScheduled = (index: number) => {
    setScheduled(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveToNextDay = () => {
    if (!midnightDialog) return;
    
    const nextDate = new Date(midnightDialog.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateString = getDateString(nextDate);

    const newScheduled: ScheduledTask = {
      id: midnightDialog.taskId,
      title: midnightDialog.task.title,
      hour: 0, // Start at midnight next day
      minute: 0,
      date: nextDateString,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setScheduled(prev => [...prev, newScheduled]);
    setMidnightDialog(null);
  };

  const handleCancelMidnight = () => {
    setMidnightDialog(null);
  };

  const renderTimeSlots = () => {
    return HOURS.map(hour => {
      const slots = [
        { hour, minute: 0, label: `${hour}:00` },
        { hour, minute: 30, label: `${hour}:30` },
      ];

      return slots.map(slot => {
        const tasksInSlot = scheduledForCurrentDay.filter(
          s => s.hour === slot.hour && s.minute === slot.minute
        );

        const isDropTarget = dragOverSlot?.hour === slot.hour && 
                            dragOverSlot?.minute === slot.minute &&
                            dragOverSlot?.date === currentDateString;

        return (
        <div
          key={`${slot.hour}-${slot.minute}`}
          data-hour={slot.minute === 0 ? slot.hour : undefined}
          className={`relative border-b border-border min-h-[60px] flex items-start transition-colors ${
            isDropTarget ? 'bg-primary/10 border-primary border-2 border-dashed' : 'hover:bg-muted/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            handleDragOver(e, slot.hour, slot.minute);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDragLeave();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrop(e, slot.hour, slot.minute);
          }}
        >
            <div className="w-16 text-xs text-muted-foreground p-2 border-r border-border shrink-0">
              {slot.label}
            </div>
            <div className="flex-1 p-2 relative">
              {tasksInSlot.map((st) => {
                const globalIndex = scheduled.indexOf(st);
                const heightMultiplier = 1; // Fixed height for now
                return (
                  <div
                    key={st.id}
                    className="absolute left-2 right-2 bg-primary/10 border border-primary/30 rounded-md p-2 cursor-pointer hover:bg-primary/20 transition-colors"
                    style={{
                      height: `${heightMultiplier * 60 - 8}px`,
                    }}
                    onContextMenu={(e) => handleContextMenu(e, globalIndex)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{st.title}</p>
                        <p className="text-xs text-muted-foreground">
                          30 min
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => removeScheduled(globalIndex)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      });
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Daily Planner</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentDay(prev => Math.max(0, prev - 1))}
            disabled={currentDay === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[140px] text-center">
            {formatDateLabel(currentDate)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentDay(prev => Math.min(2, prev + 1))}
            disabled={currentDay === 2}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Left: Task List */}
        <Card className="p-4 h-fit md:sticky md:top-6">
          <h2 className="text-lg font-semibold mb-4">Available Tasks</h2>
          <div className="space-y-2">
            {unscheduledTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">All tasks scheduled</p>
            )}
            {unscheduledTasks.map(task => {
              console.log("🎨 Rendering task:", task.id, task.title);
              return (
                <div
                  key={task.id}
                  draggable={true}
                  onDragStart={(e) => {
                    console.log("🔥 DRAG START EVENT FIRED!", task.id, task.title);
                    e.stopPropagation();
                    handleDragStart(e, task.id);
                  }}
                  onDragEnd={(e) => {
                    console.log("🔥 DRAG END EVENT FIRED!");
                    handleDragEnd();
                  }}
                  className="flex items-center gap-2 p-3 rounded-md border border-border bg-card cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
                  style={{ 
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent text-accent-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Schedule */}
        <Card className="p-0 overflow-hidden">
          <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
            <h2 className="text-lg font-semibold">Schedule</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Drag tasks from the left. Right-click scheduled tasks to adjust duration.
            </p>
          </div>
          <div 
            ref={scheduleRef} 
            className={`overflow-y-auto max-h-[calc(100vh-250px)] transition-colors ${
              isDraggingOverSchedule ? 'bg-primary/5' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setIsDraggingOverSchedule(true);
            }}
            onDragLeave={(e) => {
              // Only clear if we're leaving the schedule area entirely
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX;
              const y = e.clientY;
              
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setIsDraggingOverSchedule(false);
              }
            }}
          >
            {renderTimeSlots()}
          </div>
        </Card>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-popover border border-border rounded-md shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">
            Duration
          </div>
          {DURATION_OPTIONS.map(dur => (
            <button
              key={dur}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
              onClick={() => changeDuration(contextMenu.scheduledIndex, dur)}
            >
              {dur < 60 ? `${dur} min` : `${dur / 60}${dur % 60 === 0 ? '' : '.5'} hr`}
            </button>
          ))}
        </div>
      )}

      {/* Midnight Dialog */}
      <Dialog open={midnightDialog?.open ?? false} onOpenChange={(open) => !open && handleCancelMidnight()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task extends past midnight</DialogTitle>
            <DialogDescription>
              This task will extend beyond the current day. Would you like to move it to the next day starting at midnight?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelMidnight}>
              Cancel
            </Button>
            <Button onClick={handleMoveToNextDay}>
              Move to next day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};