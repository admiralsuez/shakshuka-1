"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, GripVertical } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { readTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import type { Task } from "@/components/tasks/Tasks";

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
    const fileExists = await exists(TASKS_FILE, { baseDir: BaseDirectory.App });
    if (!fileExists) return [];
    const text = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.App });
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
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as Task[];
  } catch {
    return [];
  }
}

type ScheduledTask = {
  taskId: string;
  task: Task;
  startHour: number; // 0-23
  startMinute: number; // 0 or 30
  durationMinutes: number; // 30, 60, 90, 120, 150, 180
};

type ContextMenu = {
  x: number;
  y: number;
  scheduledIndex: number;
};

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];

// Generate hourly slots from 6 AM to 11 PM
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6-23

export const PlannerClient = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledTask[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load tasks on mount
  useEffect(() => {
    (async () => {
      const tauri = await isTauri();
      const data = tauri ? await fetchTasksTauri() : await fetchTasksAPI();
      // Only show active (not completed) tasks
      setTasks(data.filter(t => !t.completed));
    })();
  }, []);

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

  const unscheduledTasks = useMemo(() => {
    const scheduledIds = new Set(scheduled.map(s => s.taskId));
    return tasks.filter(t => !scheduledIds.has(t.id));
  }, [tasks, scheduled]);

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleDrop = (hour: number, minute: number) => {
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task) return;

    // Add to schedule with default 30 min duration
    const newScheduled: ScheduledTask = {
      taskId: draggedTaskId,
      task,
      startHour: hour,
      startMinute: minute,
      durationMinutes: 30,
    };
    setScheduled(prev => [...prev, newScheduled]);
    setDraggedTaskId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, scheduledIndex: index });
  };

  const changeDuration = (index: number, newDuration: number) => {
    setScheduled(prev =>
      prev.map((s, i) => (i === index ? { ...s, durationMinutes: newDuration } : s))
    );
    setContextMenu(null);
  };

  const removeScheduled = (index: number) => {
    setScheduled(prev => prev.filter((_, i) => i !== index));
  };

  const renderTimeSlots = () => {
    return HOURS.map(hour => {
      const slots = [
        { hour, minute: 0, label: `${hour}:00` },
        { hour, minute: 30, label: `${hour}:30` },
      ];

      return slots.map(slot => {
        // Find scheduled tasks in this slot
        const tasksInSlot = scheduled.filter(
          s => s.startHour === slot.hour && s.startMinute === slot.minute
        );

        return (
          <div
            key={`${slot.hour}-${slot.minute}`}
            className="relative border-b border-border min-h-[60px] flex items-start"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(slot.hour, slot.minute)}
          >
            <div className="w-16 text-xs text-muted-foreground p-2 border-r border-border shrink-0">
              {slot.label}
            </div>
            <div className="flex-1 p-2 relative">
              {tasksInSlot.map((st, idx) => {
                const globalIndex = scheduled.indexOf(st);
                const heightMultiplier = st.durationMinutes / 30;
                return (
                  <div
                    key={st.taskId}
                    className="absolute left-2 right-2 bg-primary/10 border border-primary/30 rounded-md p-2 cursor-pointer hover:bg-primary/20 transition-colors"
                    style={{
                      height: `${heightMultiplier * 60 - 8}px`,
                    }}
                    onContextMenu={(e) => handleContextMenu(e, globalIndex)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{st.task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {st.durationMinutes} min
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
        <span className="ml-auto text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Left: Task List */}
        <Card className="p-4 h-fit md:sticky md:top-6">
          <h2 className="text-lg font-semibold mb-4">Available Tasks</h2>
          <div className="space-y-2">
            {unscheduledTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">All tasks scheduled</p>
            )}
            {unscheduledTasks.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task.id)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 p-3 rounded-md border border-border bg-card cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
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
            ))}
          </div>
        </Card>

        {/* Right: Schedule */}
        <Card className="p-0 overflow-hidden">
          <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
            <h2 className="text-lg font-semibold">Today's Schedule</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Drag tasks from the left. Right-click scheduled tasks to adjust duration.
            </p>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
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
    </div>
  );
};