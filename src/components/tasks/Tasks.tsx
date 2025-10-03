"use client";

import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, X, Edit, Eye, History, Undo, Download, Upload } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { loadSettings, loadStrikes, saveStrikes, type StrikeEntry, formatDateInTZ, loadUpdates, saveUpdates, type TaskUpdate, loadUsedMessages, saveUsedMessages, saveSettings } from "@/lib/local-storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getRandomCompletionMessage } from "@/lib/completion-messages";
import confetti from "canvas-confetti";

export type Task = {
  id: string; // UUID
  revision: number; // increment on each edit
  title: string;
  notes?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number; // for conflict resolution
  dueHour?: number; // 0-23 optional daily deadline
  tags?: string[];
  dueDate?: string; // YYYY-MM-DD in user TZ
};

// Helper to generate UUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Tauri detection
async function isTauri(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

// File path within the app data directory
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

async function saveTasksTauri(tasks: Task[]): Promise<void> {
  try {
    const available = await isTauri();
    if (!available) return;
    // Ensure base directory exists (noop if already present)
    await mkdir(".", { baseDir: BaseDirectory.AppData, recursive: true });
    await writeTextFile(TASKS_FILE, JSON.stringify(tasks, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch {
    // ignore
  }
}

// Existing API persistence (fallback for web)
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

async function saveTasksAPI(tasks: Task[]): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
  await fetch("/api/tasks", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(tasks),
  }).catch(() => {});
}

// Helper to check and perform weekly auto-backup
async function checkAndBackup(): Promise<void> {
  try {
    const lastBackup = localStorage.getItem("lastBackupDate");
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    if (!lastBackup || (now - parseInt(lastBackup)) > oneWeek) {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      
      // Save to localStorage as backup reference
      localStorage.setItem("lastBackupDate", now.toString());
      localStorage.setItem(`backup_${timestamp}`, JSON.stringify(data));
      
      console.log("Auto-backup completed:", timestamp);
    }
  } catch (error) {
    console.error("Auto-backup failed:", error);
  }
}

// Helper to sanitize and validate task input
function sanitizeTaskInput(input: string, maxLength: number = 200): string {
  // Strip HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

function validateTaskInput(input: string): { valid: boolean; error?: string } {
  const trimmed = input.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: "Task title cannot be empty" };
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: "Task title must be 200 characters or less" };
  }
  
  return { valid: true };
}

// Add export/import helper functions after saveTasksAPI
async function exportData() {
  try {
    const [tasks, settings, strikes, updates, usedMessages] = await Promise.all([
      (await isTauri()) ? fetchTasksTauri() : fetchTasksAPI(),
      loadSettings(),
      loadStrikes(),
      loadUpdates(),
      loadUsedMessages()
    ]);
    
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      tasks,
      settings,
      strikes,
      updates,
      usedMessages
    };
    
    return exportData;
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}

async function importData(data: any): Promise<void> {
  try {
    // Validate import data
    if (!data || !data.version || !Array.isArray(data.tasks)) {
      throw new Error("Invalid import data format");
    }
    
    // Import tasks
    if ((await isTauri())) {
      await saveTasksTauri(data.tasks);
    } else {
      await saveTasksAPI(data.tasks);
    }
    
    // Import other data
    if (data.settings) await saveSettings(data.settings);
    if (data.strikes) await saveStrikes(data.strikes);
    if (data.updates) await saveUpdates(data.updates);
    if (data.usedMessages) await saveUsedMessages(data.usedMessages);
    
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
}

export interface TasksHandle {
  openAddDialog: () => void;
}

export const Tasks = forwardRef<TasksHandle, { compact?: boolean }>(({ compact = false }, ref) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  // Add Task dialog state
  const [addOpen, setAddOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useTauriRef = useRef(false);
  const tasksRef = useRef<Task[]>([]);

  // strike dialog state
  const [strikeTaskId, setStrikeTaskId] = useState<string | null>(null);
  const [strikeNote, setStrikeNote] = useState("");

  // settings/strikes in memory for quick checks
  const [resetHour, setResetHour] = useState<number>(9);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [strikes, setStrikes] = useState<StrikeEntry[]>([]);

  // Add updates state
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [showUpdateHistory, setShowUpdateHistory] = useState(false);

  // Task detail/edit dialog state
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");

  // Add completion dialog state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [usedMessageIds, setUsedMessageIds] = useState<string[]>([]);
  
  // Track previous allStruck state to detect transition - ADD FLAG TO TRACK IF STRIKE ACTION HAPPENED
  const prevAllStruckRef = useRef(false);
  const userActionRef = useRef(false); // NEW: Track if user performed a strike action
  
  // Add striking animation state
  const [strikingTaskId, setStrikingTaskId] = useState<string | null>(null);

  // Add daily recap dialog state
  const [showRecapDialog, setShowRecapDialog] = useState(false);
  const [recapData, setRecapData] = useState<{
    date: string;
    totalTasks: number;
    completed: number;
    struck: number;
    expired: number;
  } | null>(null);

  // Add first-time setup dialog state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupResetHour, setSetupResetHour] = useState(9);
  const [setupFavoriteColor, setSetupFavoriteColor] = useState("#007AFF");

  // Add button color state
  const [buttonColor, setButtonColor] = useState("#007AFF");
  
  // Add import/export state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // search & filter - now inline above tabs
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Load once - check for first-time setup
  useEffect(() => {
    let mounted = true;
    (async () => {
      const tauri = await isTauri();
      useTauriRef.current = tauri;
      const [settings, existingStrikes, existingUpdates, existingUsedMessages, data] = await Promise.all([
        loadSettings(),
        loadStrikes(),
        loadUpdates(),
        loadUsedMessages(),
        tauri ? fetchTasksTauri() : fetchTasksAPI(),
      ]);
      if (!mounted) return;
      
      // Check if first-time setup is needed
      if (!settings.firstTimeSetupCompleted) {
        setSetupName(settings.userName || "");
        setSetupResetHour(settings.resetHour);
        setSetupFavoriteColor(settings.buttonColor || "#007AFF");
        setShowSetupDialog(true);
      }
      
      setResetHour(settings.resetHour);
      setTimezone(settings.timezone);
      setButtonColor(settings.buttonColor || "#007AFF");
      setStrikes(existingStrikes);
      setUpdates(existingUpdates);
      setUsedMessageIds(existingUsedMessages);
      setTasks(data);
      hasLoadedRef.current = true;
      
      // Check if we should show daily recap
      const lastRecapDate = localStorage.getItem("lastRecapDate");
      const todayStr = formatDateInTZ(Date.now(), settings.timezone);
      
      if (lastRecapDate && lastRecapDate !== todayStr) {
        // Calculate previous day's stats
        const previousDayStrikes = existingStrikes.filter(s => s.date === lastRecapDate);
        const completedCount = previousDayStrikes.filter(s => s.action === "completed" || s.action === "strike").length;
        const struckCount = previousDayStrikes.filter(s => s.action === "strike").length;
        const expiredCount = previousDayStrikes.filter(s => s.action === "expired").length;
        const totalTasks = new Set(previousDayStrikes.map(s => s.taskId)).size;
        
        if (totalTasks > 0) {
          setRecapData({
            date: lastRecapDate,
            totalTasks,
            completed: completedCount,
            struck: struckCount,
            expired: expiredCount
          });
          setShowRecapDialog(true);
        }
        
        // Update last recap date
        localStorage.setItem("lastRecapDate", todayStr);
      } else if (!lastRecapDate) {
        // First time - set today as last recap date
        localStorage.setItem("lastRecapDate", todayStr);
      }
      
      // Check and perform auto-backup
      await checkAndBackup();
    })();
    return () => {
      mounted = false;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  // Auto-refresh tasks at reset hour
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    
    const checkAndRefresh = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if we're at the reset hour (within the first minute)
      if (currentHour === resetHour && currentMinute === 0) {
        const todayStr = formatDateInTZ(Date.now(), timezone);
        const lastRecapDate = localStorage.getItem("lastRecapDate");
        
        // Reload tasks and strikes
        (async () => {
          const [existingStrikes, data] = await Promise.all([
            loadStrikes(),
            useTauriRef.current ? fetchTasksTauri() : fetchTasksAPI(),
          ]);
          setStrikes(existingStrikes);
          setTasks(data);
          
          // Show recap if new day
          if (lastRecapDate && lastRecapDate !== todayStr) {
            const previousDayStrikes = existingStrikes.filter(s => s.date === lastRecapDate);
            const completedCount = previousDayStrikes.filter(s => s.action === "completed" || s.action === "strike").length;
            const struckCount = previousDayStrikes.filter(s => s.action === "strike").length;
            const expiredCount = previousDayStrikes.filter(s => s.action === "expired").length;
            const totalTasks = new Set(previousDayStrikes.map(s => s.taskId)).size;
            
            if (totalTasks > 0) {
              setRecapData({
                date: lastRecapDate,
                totalTasks,
                completed: completedCount,
                struck: struckCount,
                expired: expiredCount
              });
              setShowRecapDialog(true);
            }
            
            localStorage.setItem("lastRecapDate", todayStr);
          }
        })();
      }
    };
    
    // Check every minute
    const intervalId = setInterval(checkAndRefresh, 60000);
    return () => clearInterval(intervalId);
  }, [resetHour, timezone]);

  // Persist on change
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    // keep latest tasks in ref for interval autosave
    tasksRef.current = tasks;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (useTauriRef.current) {
        saveTasksTauri(tasks);
      } else {
        saveTasksAPI(tasks);
      }
    }, 400);

    // Flush pending save on unmount or before next change
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        if (useTauriRef.current) {
          saveTasksTauri(tasks);
        } else {
          saveTasksAPI(tasks);
        }
      }
    };
  }, [tasks]);

  // Autosave every 10 seconds
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const id = setInterval(() => {
      const current = tasksRef.current;
      if (!current) return;
      if (useTauriRef.current) {
        saveTasksTauri(current);
      } else {
        saveTasksAPI(current);
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const todayStr = useMemo(() => formatDateInTZ(Date.now(), timezone), [timezone]);
  const currentHour = useMemo(() => new Date().getHours(), []);

  // Build a quick lookup for tasks struck today
  const struckTodayIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of strikes) {
      if (s.date === todayStr && s.action !== "expired") set.add(s.taskId);
    }
    return set;
  }, [strikes, todayStr]);

  // categorize
  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);
  const activeTasks = useMemo(() => {
    const arr = tasks.filter(t => !t.completed);
    // move struck-today items to the end
    return arr.sort((a, b) => {
      const aStruck = struckTodayIds.has(a.id);
      const bStruck = struckTodayIds.has(b.id);
      if (aStruck === bStruck) return 0;
      return aStruck ? 1 : -1;
    });
  }, [tasks, struckTodayIds]);

  const expiredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.completed) return false;
      // if already struck today, it's not expired
      const struckToday = strikes.some(s => s.taskId === t.id && s.date === todayStr && s.action !== "expired");
      if (struckToday) return false;
      // New logic: compare dueDate string to todayStr
      if (t.dueDate) {
        return todayStr > t.dueDate;
      }
      // Legacy fallback: dueHour logic
      if (t.dueHour == null) return false;
      return currentHour >= t.dueHour;
    });
  }, [tasks, strikes, todayStr, currentHour]);

  const remaining = useMemo(() => activeTasks.length, [activeTasks]);

  // Helper to calculate diff between two task states
  const calculateDiff = (oldTask: Task, newTask: Task): Record<string, { old: any; new: any }> => {
    const diff: Record<string, { old: any; new: any }> = {};
    const keys = new Set([...Object.keys(oldTask), ...Object.keys(newTask)]);
    
    for (const key of keys) {
      const oldVal = (oldTask as any)[key];
      const newVal = (newTask as any)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { old: oldVal, new: newVal };
      }
    }
    
    return diff;
  };

  // Helper to record task update
  const recordUpdate = async (oldTask: Task, newTask: Task) => {
    const diff = calculateDiff(oldTask, newTask);
    if (Object.keys(diff).length === 0) return; // No changes
    
    const update: TaskUpdate = {
      updateId: generateUUID(),
      taskId: newTask.id,
      timestamp: Date.now(),
      diff,
      fullSnapshot: newTask
    };
    
    const newUpdates = [...updates, update];
    setUpdates(newUpdates);
    await saveUpdates(newUpdates);
  };

  // searchable tag list
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      t.tags?.forEach(tag => set.add(tag));
    }
    return Array.from(set).sort();
  }, [tasks]);

  const matchesTask = (t: Task) => {
    const q = query.trim().toLowerCase();
    const textOk = q
      ? t.title.toLowerCase().includes(q) || (t.notes?.toLowerCase().includes(q) ?? false) || (t.tags?.some(tag => tag.includes(q)) ?? false)
      : true;
    const tagsOk = selectedTags.length
      ? (t.tags ? selectedTags.every(tag => t.tags!.includes(tag)) : false)
      : true;
    return textOk && tagsOk;
  };

  const activeFiltered = useMemo(() => activeTasks.filter(matchesTask), [activeTasks, query, selectedTags]);
  const expiredFiltered = useMemo(() => expiredTasks.filter(matchesTask), [expiredTasks, query, selectedTags]);
  const completedFiltered = useMemo(() => completedTasks.filter(matchesTask), [completedTasks, query, selectedTags]);

  // Get the task being viewed/edited
  const detailTask = useMemo(() => {
    if (!detailTaskId) return null;
    return tasks.find(t => t.id === detailTaskId) || null;
  }, [detailTaskId, tasks]);

  // Check if all active tasks are struck - only trigger on transition AND after user action
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!userActionRef.current) return; // NEW: Only check after user action
    if (activeTasks.length === 0) {
      prevAllStruckRef.current = false;
      return;
    }
    
    // Check if all active tasks are struck today
    const allStruck = activeTasks.every(t => struckTodayIds.has(t.id));
    
    // Only show dialog when transitioning from false to true
    if (allStruck && !prevAllStruckRef.current && !showCompletionDialog) {
      // Get random message
      const message = getRandomCompletionMessage(usedMessageIds);
      setCompletionMessage(message.text);
      
      // Update used messages
      const newUsedIds = [...usedMessageIds, message.msgId];
      setUsedMessageIds(newUsedIds);
      saveUsedMessages(newUsedIds);
      
      // Show completion dialog
      setShowCompletionDialog(true);
      
      // Reset user action flag
      userActionRef.current = false;
    }
    
    // Update previous state
    prevAllStruckRef.current = allStruck;
  }, [activeTasks, struckTodayIds, showCompletionDialog, hasLoadedRef]);

  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const todayStrikes = strikes.filter(s => s.date === todayStr);
    const completedToday = todayStrikes.filter(s => s.action === "completed" || s.action === "strike");
    
    // Calculate completion times
    const times = todayStrikes.map(s => new Date(s.ts).toLocaleTimeString());
    
    return {
      total: activeTasks.length + completedTasks.length,
      completed: completedToday.length,
      times
    };
  }, [strikes, todayStr, activeTasks, completedTasks]);

  // Add export handler
  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shakshuka-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
      setShowExportDialog(false);
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
  };

  // Add import handler
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      
      // Reload all data
      const [newSettings, newStrikes, newUpdates, newUsedMessages, newTasks] = await Promise.all([
        loadSettings(),
        loadStrikes(),
        loadUpdates(),
        loadUsedMessages(),
        useTauriRef.current ? fetchTasksTauri() : fetchTasksAPI(),
      ]);
      
      setResetHour(newSettings.resetHour);
      setTimezone(newSettings.timezone);
      setButtonColor(newSettings.buttonColor || "#007AFF");
      setStrikes(newStrikes);
      setUpdates(newUpdates);
      setUsedMessageIds(newUsedMessages);
      setTasks(newTasks);
      
      toast.success("Data imported successfully! Page will reload.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error("Import failed. Please check the file format.");
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Add task with validation
  const addTask = () => {
    const sanitized = sanitizeTaskInput(title);
    const validation = validateTaskInput(sanitized);
    
    if (!validation.valid) {
      toast.error(validation.error || "Invalid task");
      return;
    }
    
    const tags = tagsInput
      .split(",")
      .map(t => sanitizeTaskInput(t, 50))
      .filter(Boolean);
    const now = Date.now();
    const newTask: Task = {
      id: generateUUID(),
      revision: 0,
      title: sanitized,
      notes: sanitizeTaskInput(notes, 1000) || undefined,
      completed: false,
      createdAt: now,
      updatedAt: now,
      ...(dueDate ? { dueDate } : {}),
      ...(tags.length ? { tags } : {}),
    };
    setTasks(prev => [newTask, ...prev]);
    setTitle("");
    setNotes("");
    setDueDate("");
    setTagsInput("");
    setAddOpen(false);
    inputRef.current?.focus();
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed, revision: t.revision + 1, updatedAt: Date.now() } : t)));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Open task detail dialog
  const openTaskDetail = (task: Task) => {
    setDetailTaskId(task.id);
    setIsEditing(false);
    setEditTitle(task.title);
    setEditNotes(task.notes || "");
    setEditDueDate(task.dueDate || "");
    setEditTagsInput(task.tags?.join(", ") || "");
  };

  // Close task detail dialog
  const closeTaskDetail = () => {
    setDetailTaskId(null);
    setIsEditing(false);
    setEditTitle("");
    setEditNotes("");
    setEditDueDate("");
    setEditTagsInput("");
  };

  // Save edited task with validation and update tracking
  const saveEditedTask = async () => {
    if (!detailTaskId) return;
    const sanitized = sanitizeTaskInput(editTitle);
    const validation = validateTaskInput(sanitized);
    
    if (!validation.valid) {
      toast.error(validation.error || "Invalid task");
      return;
    }

    const oldTask = tasks.find(t => t.id === detailTaskId);
    if (!oldTask) return;

    const tags = editTagsInput
      .split(",")
      .map(t => sanitizeTaskInput(t, 50))
      .filter(Boolean);

    const newTask: Task = {
      ...oldTask,
      title: sanitized,
      notes: sanitizeTaskInput(editNotes, 1000) || undefined,
      dueDate: editDueDate || undefined,
      tags: tags.length ? tags : undefined,
      revision: oldTask.revision + 1,
      updatedAt: Date.now()
    };

    await recordUpdate(oldTask, newTask);
    
    setTasks(prev => prev.map(t => t.id === detailTaskId ? newTask : t));
    setIsEditing(false);
    toast.success("Task updated");
  };

  // Undo strike with 10s timeout - FIXED VERSION
  const undoStrike = async (strikeTimestamp: number) => {
    // Reload strikes from storage to get the latest data (fixes closure issue)
    const latestStrikes = await loadStrikes();
    
    // Find the strike by its exact timestamp
    const strikeToUndo = latestStrikes.find(s => s.ts === strikeTimestamp);
    
    if (!strikeToUndo) {
      toast.error("No recent strike found to undo");
      return;
    }
    
    // Remove the specific strike entry
    const newStrikes = latestStrikes.filter(s => s.ts !== strikeTimestamp);
    
    setStrikes(newStrikes);
    await saveStrikes(newStrikes);
    toast.success("Strike undone successfully");
  };

  // Get update history for a task
  const getTaskUpdates = (taskId: string) => {
    return updates
      .filter(u => u.taskId === taskId)
      .sort((a, b) => b.timestamp - a.timestamp); // newest first
  };

  // Get strike notes for a task
  const getTaskStrikeNotes = (taskId: string) => {
    return strikes
      .filter(s => s.taskId === taskId && s.note)
      .sort((a, b) => b.ts - a.ts); // newest first
  };

  // strike handling with undo notification and animation
  const onStrikeToday = async (taskId: string) => {
    // Start strike animation
    setStrikingTaskId(taskId);
    
    // Wait for animation (1.2s now for slower effect)
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Trigger confetti from the task position
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      const rect = taskElement.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { x, y },
        scalar: 0.6,
        gravity: 1.2,
        ticks: 100
      });
    } else {
      // Fallback: center confetti
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { x: 0.5, y: 0.5 },
        scalar: 0.6,
        gravity: 1.2,
        ticks: 100
      });
    }
    
    const strikeTimestamp = Date.now();
    const entry: StrikeEntry = {
      taskId,
      date: todayStr,
      note: strikeNote.trim() || undefined,
      ts: strikeTimestamp,
      action: "strike",
    };
    const next = [...strikes, entry];
    setStrikes(next);
    await saveStrikes(next);
    setStrikeTaskId(null);
    setStrikeNote("");
    setStrikingTaskId(null);
    
    // Set user action flag to enable completion check
    userActionRef.current = true;
    
    // Dispatch custom event to stop pomodoro timer
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("task-struck"));
    }
    
    // Show undo toast for 10 seconds - pass the timestamp
    toast.success("Task struck for today", {
      action: {
        label: "Undo",
        onClick: () => undoStrike(strikeTimestamp)
      },
      duration: 10000
    });
  };

  const onMarkCompleted = async (taskId: string) => {
    const entry: StrikeEntry = {
      taskId,
      date: todayStr,
      note: strikeNote.trim() || undefined,
      ts: Date.now(),
      action: "completed",
    };
    const next = [...strikes, entry];
    setStrikes(next);
    await saveStrikes(next);
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, completed: true } : t)));
    setStrikeTaskId(null);
    setStrikeNote("");
    
    // Set user action flag
    userActionRef.current = true;
  };

  // Render task with Strike/View Update button
  const renderStrikeButton = (t: Task) => {
    const struck = struckTodayIds.has(t.id);
    const isStriking = strikingTaskId === t.id;
    const strikeNotes = getTaskStrikeNotes(t.id);
    
    if (struck && strikeNotes.length > 0) {
      return (
        <Button 
          size="sm" 
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            openTaskDetail(t);
            setShowUpdateHistory(true);
          }}
          className="flex-1 min-w-0"
        >
          <History className="h-4 w-4 mr-1" /> Updates
        </Button>
      );
    }
    
    return (
      <Dialog open={strikeTaskId === t.id} onOpenChange={(open) => { if (!open) { setStrikeTaskId(null); setStrikeNote(""); } }}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            variant={struck ? "ghost" : "secondary"} 
            onClick={(e) => {
              e.stopPropagation();
              setStrikeTaskId(t.id);
            }}
            className="flex-1 min-w-0"
            disabled={struck || isStriking}
            style={!struck && !isStriking ? { backgroundColor: buttonColor, color: 'white' } : undefined}
          >
            {isStriking ? "Striking..." : "Strike"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Strike "{t.title}"</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`strike-note-${t.id}`}>Add note (optional)</Label>
            <Textarea id={`strike-note-${t.id}`} value={strikeNote} onChange={(e) => setStrikeNote(e.target.value)} rows={3} placeholder="What did you do?" />
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="secondary" 
              onClick={() => onStrikeToday(t.id)}
              style={{ backgroundColor: buttonColor, color: 'white' }}
            >
              Strike for today
            </Button>
            <Button 
              onClick={() => onMarkCompleted(t.id)}
              style={{ backgroundColor: buttonColor, color: 'white' }}
            >
              Mark as completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Render task card/item with click handler and animation
  const renderTaskItem = (t: Task, struck: boolean, compact: boolean) => {
    const isStriking = strikingTaskId === t.id;
    const animationClass = isStriking ? "animate-strike" : "";
    
    const taskContent = compact ? (
      <div 
        key={t.id}
        data-task-id={t.id}
        className={`p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer ${animationClass}`} 
        onClick={() => openTaskDetail(t)}
      >
        <div className="space-y-2">
          <p className={`text-sm font-medium line-clamp-2 transition-all duration-600 ${t.completed || struck ? "line-through text-muted-foreground" : ""}`}>
            {t.title}
          </p>
          {(t.dueDate || typeof t.dueHour === "number") && (
            <p className="text-xs text-muted-foreground">
              Due: {t.dueDate || `${t.dueHour}:00`}
            </p>
          )}
          {t.tags && t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {t.tags.slice(0, 2).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px]">#{tag}</span>
              ))}
              {t.tags.length > 2 && <span className="text-xs text-muted-foreground">+{t.tags.length - 2}</span>}
            </div>
          )}
          <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
            {renderStrikeButton(t)}
            <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task" className="shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    ) : (
      <li 
        key={t.id}
        data-task-id={t.id}
        className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors ${animationClass}`} 
        onClick={() => openTaskDetail(t)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className={`text-sm sm:text-base transition-all duration-600 ${t.completed || struck ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </p>
              {(t.dueDate || typeof t.dueHour === "number") && (
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Due {t.dueDate || `${t.dueHour}:00`}
                </p>
              )}
              {t.notes && (
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {t.notes}
                </p>
              )}
              {t.tags && t.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px]">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {renderStrikeButton(t)}
              <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task" className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </li>
    );
    return taskContent;
  };

  // Save first-time setup
  const saveFirstTimeSetup = async () => {
    const settings = await loadSettings();
    const newSettings = {
      ...settings,
      userName: setupName.trim() || undefined,
      resetHour: setupResetHour,
      buttonColor: setupFavoriteColor,
      firstTimeSetupCompleted: true
    };
    await saveSettings(newSettings);
    setResetHour(setupResetHour);
    setButtonColor(setupFavoriteColor);
    setShowSetupDialog(false);
    toast.success("Welcome! Your preferences have been saved.");
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openAddDialog: () => {
      setAddOpen(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }));

  return (
    <>
      <style jsx global>{`
        @keyframes strike-through {
          0% {
            background-size: 0% 2px;
            background-position: 0% 50%;
          }
          100% {
            background-size: 100% 2px;
            background-position: 100% 50%;
          }
        }
        
        .animate-strike {
          animation: strike-through 1.2s ease-in-out forwards;
        }
        
        .animate-strike p {
          background: linear-gradient(to right, currentColor 0%, currentColor 100%) no-repeat;
          background-size: 0% 2px;
          background-position: 0% 50%;
        }
      `}</style>
      
      <Card className="w-full">
        <CardHeader className={compact ? "pb-3" : ""}>
          <CardTitle className={`flex items-center justify-between text-xl`}>
            <span>Tasks {useTauriRef.current ? "(desktop data)" : "(local file-backed)"}</span>
            <div className="flex items-center gap-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm"
                    style={{ backgroundColor: buttonColor, color: 'white' }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add a new task</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="task-title">Title</Label>
                      <Input
                        id="task-title"
                        ref={inputRef}
                        placeholder="Task title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="task-due">Due date</Label>
                      <Input
                        id="task-due"
                        type="date"
                        placeholder="YYYY-MM-DD"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="sm:w-56"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="task-notes" className="text-sm text-muted-foreground">Notes (optional)</Label>
                      <Textarea
                        id="task-notes"
                        placeholder="Details, links, etc."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="task-tags" className="text-sm text-muted-foreground">Tags (comma-separated)</Label>
                      <Input
                        id="task-tags"
                        placeholder="e.g. work, urgent, home"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={addTask} disabled={!title.trim()}>Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "space-y-2" : "space-y-4"}>
          {/* Search moved above tabs - inline */}
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tasks…" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
                {query && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {allTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Filter by tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const active = selectedTags.includes(tag);
                    return (
                      <Button
                        key={tag}
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                        className="h-7 rounded-full"
                      >
                        #{tag}
                      </Button>
                    );
                  })}
                </div>
                {selectedTags.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedTags([])} className="h-7">Clear tags</Button>
                )}
              </div>
            )}
          </div>

          {/* First-Time Setup Dialog */}
          <Dialog open={showSetupDialog} onOpenChange={(open) => { if (!open && showSetupDialog) return; setShowSetupDialog(open); }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Welcome! 👋</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-center text-sm text-muted-foreground">
                  Let's personalize your experience
                </p>
                
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="setup-name">Your Name (optional)</Label>
                    <Input
                      id="setup-name"
                      placeholder="What should we call you?"
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Used in greetings</p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="setup-reset-hour">Daily Reset Time</Label>
                    <select
                      id="setup-reset-hour"
                      value={setupResetHour}
                      onChange={(e) => setSetupResetHour(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">When should your tasks refresh?</p>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="setup-color">Favorite Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="setup-color"
                        type="color"
                        value={setupFavoriteColor}
                        onChange={(e) => setSetupFavoriteColor(e.target.value)}
                        className="h-10 w-20 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={setupFavoriteColor}
                        onChange={(e) => setSetupFavoriteColor(e.target.value)}
                        placeholder="#007AFF"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Used for button accents</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveFirstTimeSetup} className="w-full">
                  Get Started
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Completion Dialog */}
          <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">🎉 All Done!</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-center text-lg font-medium">{completionMessage}</p>
                
                <div className="space-y-2 pt-4 border-t">
                  <h3 className="font-semibold text-sm text-muted-foreground">Daily Stats</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-2xl font-bold text-center">{dailyStats.total}</p>
                      <p className="text-xs text-center text-muted-foreground">Total Tasks</p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-2xl font-bold text-center">{dailyStats.completed}</p>
                      <p className="text-xs text-center text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setShowCompletionDialog(false)} className="w-full">
                  Awesome!
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Daily Recap Dialog */}
          <Dialog open={showRecapDialog} onOpenChange={setShowRecapDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">📅 Yesterday's Recap</DialogTitle>
              </DialogHeader>
              {recapData && (
                <div className="space-y-4 py-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Summary for {recapData.date}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-md bg-muted/50">
                        <p className="text-2xl font-bold text-center">{recapData.totalTasks}</p>
                        <p className="text-xs text-center text-muted-foreground">Total Tasks</p>
                      </div>
                      <div className="p-3 rounded-md bg-green-100 dark:bg-green-900/30">
                        <p className="text-2xl font-bold text-center text-green-700 dark:text-green-300">{recapData.completed}</p>
                        <p className="text-xs text-center text-muted-foreground">Completed</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-md bg-blue-100 dark:bg-blue-900/30">
                        <p className="text-2xl font-bold text-center text-blue-700 dark:text-blue-300">{recapData.struck}</p>
                        <p className="text-xs text-center text-muted-foreground">Struck</p>
                      </div>
                      <div className="p-3 rounded-md bg-orange-100 dark:bg-orange-900/30">
                        <p className="text-2xl font-bold text-center text-orange-700 dark:text-orange-300">{recapData.expired}</p>
                        <p className="text-xs text-center text-muted-foreground">Expired</p>
                      </div>
                    </div>
                    
                    {recapData.completed > 0 && (
                      <div className="pt-2 text-center">
                        <p className="text-sm font-medium">
                          {recapData.completed === recapData.totalTasks 
                            ? "🎉 Perfect day! All tasks completed!"
                            : `${Math.round((recapData.completed / recapData.totalTasks) * 100)}% completion rate`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setShowRecapDialog(false)} className="w-full">
                  Got it!
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Tabs for Active / Expired / Completed */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList>
              <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
              <TabsTrigger value="expired">Expired ({expiredTasks.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-2">
              {compact ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {activeFiltered.length === 0 && (
                    <p className="text-muted-foreground p-3 text-sm col-span-full">No active tasks.</p>
                  )}
                  {activeFiltered.map((t) => {
                    const struck = struckTodayIds.has(t.id);
                    return renderTaskItem(t, struck, true);
                  })}
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-md border">
                  {activeFiltered.length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground">No active tasks.</li>
                  )}
                  {activeFiltered.map((t) => {
                    const struck = struckTodayIds.has(t.id);
                    return renderTaskItem(t, struck, false);
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="expired" className="mt-2">
              {compact ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {expiredFiltered.length === 0 && (
                    <p className="text-muted-foreground p-3 text-sm col-span-full">No expired tasks.</p>
                  )}
                  {expiredFiltered.map((t) => {
                    const struck = struckTodayIds.has(t.id);
                    return renderTaskItem(t, struck, true);
                  })}
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-md border">
                  {expiredFiltered.length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground">No expired tasks.</li>
                  )}
                  {expiredFiltered.map((t) => {
                    const struck = struckTodayIds.has(t.id);
                    return renderTaskItem(t, struck, false);
                  })}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-2">
              {compact ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {completedFiltered.length === 0 && (
                    <p className="text-muted-foreground p-3 text-sm col-span-full">No completed tasks.</p>
                  )}
                  {completedFiltered.map((t) => (
                    <div key={t.id} className="p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => openTaskDetail(t)}>
                      <div className="space-y-2">
                        <p className="text-sm font-medium line-clamp-2 line-through text-muted-foreground text-center">{t.title}</p>
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {t.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px]">#{tag}</span>
                            ))}
                            {t.tags.length > 2 && <span className="text-xs text-muted-foreground">+{t.tags.length - 2}</span>}
                          </div>
                        )}
                        <div className="flex items-center justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-md border">
                  {completedFiltered.length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground">No completed tasks.</li>
                  )}
                  {completedFiltered.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openTaskDetail(t)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="line-through text-muted-foreground text-sm sm:text-base text-center">{t.title}</p>
                            {t.notes && (
                              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.notes}</p>
                            )}
                            {t.tags && t.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1 justify-center">
                                {t.tags.map(tag => (
                                  <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px]">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>

          {/* Task Detail/Edit Dialog */}
          <Dialog open={!!detailTaskId} onOpenChange={(open) => { if (!open) closeTaskDetail(); }}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{isEditing ? "Edit Task" : "Task Details"}</span>
                  {!isEditing && !showUpdateHistory && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>
              {detailTask && (
                <div className="grid gap-4">
                  {showUpdateHistory ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Strike Notes</h3>
                        <Button size="sm" variant="ghost" onClick={() => setShowUpdateHistory(false)}>
                          Back
                        </Button>
                      </div>
                      {getTaskStrikeNotes(detailTask.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No strike notes recorded yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {getTaskStrikeNotes(detailTask.id).map((strike) => (
                            <div key={strike.ts} className="p-3 border rounded-md bg-muted/30">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(strike.ts).toLocaleString()}
                                </p>
                                <span className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px]">
                                  {strike.date}
                                </span>
                              </div>
                              <p className="text-sm">{strike.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : isEditing ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-task-title">Title</Label>
                        <Input
                          id="edit-task-title"
                          placeholder="Task title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-task-due">Due date</Label>
                        <Input
                          id="edit-task-due"
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="sm:w-56"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-task-notes">Notes</Label>
                        <Textarea
                          id="edit-task-notes"
                          placeholder="Details, links, etc."
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-task-tags">Tags (comma-separated)</Label>
                        <Input
                          id="edit-task-tags"
                          placeholder="e.g. work, urgent, home"
                          value={editTagsInput}
                          onChange={(e) => setEditTagsInput(e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{detailTask.title}</h3>
                        {detailTask.dueDate && (
                          <p className="text-sm text-muted-foreground">Due: {detailTask.dueDate}</p>
                        )}
                        {detailTask.notes && (
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground">Notes:</Label>
                            <p className="text-sm mt-1">{detailTask.notes}</p>
                          </div>
                        )}
                        {detailTask.tags && detailTask.tags.length > 0 && (
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground">Tags:</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {detailTask.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">#{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="pt-2 text-xs text-muted-foreground space-y-1">
                          <p>Created: {new Date(detailTask.createdAt).toLocaleString()}</p>
                          <p>Last updated: {new Date(detailTask.updatedAt).toLocaleString()}</p>
                          <p>Revision: {detailTask.revision}</p>
                        </div>
                        {getTaskStrikeNotes(detailTask.id).length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setShowUpdateHistory(true)}
                            className="mt-2"
                          >
                            <History className="h-4 w-4 mr-1" /> View Strike Notes ({getTaskStrikeNotes(detailTask.id).length})
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                {isEditing ? (
                  <>
                    <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={saveEditedTask} disabled={!editTitle.trim()}>Save Changes</Button>
                  </>
                ) : showUpdateHistory ? null : (
                  <Button onClick={closeTaskDetail}>Close</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
});

Tasks.displayName = "Tasks";