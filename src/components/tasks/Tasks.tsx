"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { loadSettings, loadStrikes, saveStrikes, type StrikeEntry, formatDateInTZ } from "@/lib/local-storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  createdAt: number;
  dueHour?: number; // 0-23 optional daily deadline
  tags?: string[];
  // add new optional absolute due date (YYYY-MM-DD in user TZ)
  dueDate?: string;
};

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
    const fileExists = await exists(TASKS_FILE, { baseDir: BaseDirectory.App });
    if (!fileExists) return [];
    const text = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.App });
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
    await mkdir(".", { baseDir: BaseDirectory.App, recursive: true });
    await writeTextFile(TASKS_FILE, JSON.stringify(tasks, null, 2), {
      baseDir: BaseDirectory.App,
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

export const Tasks = ({ compact = false }: { compact?: boolean }) => {
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

  // search & filter
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Load once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const tauri = await isTauri();
      useTauriRef.current = tauri;
      const [settings, existingStrikes, data] = await Promise.all([
        loadSettings(),
        loadStrikes(),
        tauri ? fetchTasksTauri() : fetchTasksAPI(),
      ]);
      if (!mounted) return;
      setResetHour(settings.resetHour);
      setTimezone(settings.timezone);
      setStrikes(existingStrikes);
      setTasks(data);
      hasLoadedRef.current = true;
    })();
    return () => {
      mounted = false;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

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

  const addTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const tags = tagsInput
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    const newTask: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: trimmed,
      notes: notes.trim() || undefined,
      completed: false,
      createdAt: Date.now(),
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
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed, ...(t.completed ? { } : { }) } : t)));
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // remove bulk actions per request

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

  // strike handling
  const onStrikeToday = async (taskId: string) => {
    const entry: StrikeEntry = {
      taskId,
      date: todayStr,
      note: strikeNote.trim() || undefined,
      ts: Date.now(),
      action: "strike",
    };
    const next = [...strikes, entry];
    setStrikes(next);
    await saveStrikes(next);
    setStrikeTaskId(null);
    setStrikeNote("");
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
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className={compact ? "pb-3" : ""}>
        <CardTitle className={`flex items-center justify-between ${compact ? "text-lg" : "text-xl"}`}>
          <span>Tasks {useTauriRef.current ? "(desktop data)" : "(local file-backed)"}</span>
          <div className="flex items-center gap-2">
            <span className={`font-normal text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>{remaining} active</span>
            <Button size="icon" variant="ghost" onClick={() => setShowSearch(v => !v)} aria-label="Search tasks">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "space-y-3" : "space-y-6"}>
        {showSearch && (
          <div className="space-y-2">
            <Input placeholder="Search tasks…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {allTags.length > 0 && (
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
                {selectedTags.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedTags([])} className="h-7">Clear tags</Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Task dialog trigger */}
        <div className="flex items-center justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className={`shrink-0 ${compact ? "h-8 text-sm" : ""}`}>
                <Plus className={`mr-1 ${compact ? "h-3 w-3" : "h-4 w-4"}`} /> Add Task
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

        {/* Tabs for Active / Expired / Completed */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active" className={compact ? "text-xs" : ""}>Active ({activeTasks.length})</TabsTrigger>
            <TabsTrigger value="expired" className={compact ? "text-xs" : ""}>Expired ({expiredTasks.length})</TabsTrigger>
            <TabsTrigger value="completed" className={compact ? "text-xs" : ""}>Completed ({completedTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-2">
            {compact ? (
              // Compact view: Small cards in grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeFiltered.length === 0 && (
                  <p className="text-muted-foreground p-3 text-xs col-span-full">No active tasks.</p>
                )}
                {activeFiltered.map((t) => {
                  const struck = struckTodayIds.has(t.id);
                  return (
                    <div key={t.id} className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                      <div className="space-y-2">
                        <p className={`text-xs font-medium line-clamp-2 ${t.completed || struck ? "line-through text-muted-foreground" : ""}`}>
                          {t.title}
                        </p>
                        {(t.dueDate || typeof t.dueHour === "number") && (
                          <p className="text-[10px] text-muted-foreground">
                            Due: {t.dueDate || `${t.dueHour}:00`}
                          </p>
                        )}
                        {t.tags && t.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {t.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px]">#{tag}</span>
                            ))}
                            {t.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{t.tags.length - 2}</span>}
                          </div>
                        )}
                        <div className="flex items-center gap-1 pt-1">
                          <Dialog open={strikeTaskId === t.id} onOpenChange={(open) => { if (!open) { setStrikeTaskId(null); setStrikeNote(""); } }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => setStrikeTaskId(t.id)} className="h-6 text-[10px] flex-1">Strike</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Strike "{t.title}"</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-2">
                                <Label htmlFor={`strike-note-${t.id}`}>Add note (optional)</Label>
                                <Textarea id={`strike-note-${t.id}`} value={strikeNote} onChange={(e) => setStrikeNote(e.target.value)} rows={3} placeholder="What did you do?" />
                              </div>
                              <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="secondary" onClick={() => onStrikeToday(t.id)}>Strike for today</Button>
                                <Button onClick={() => onMarkCompleted(t.id)}>Mark as completed</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task" className="h-6 w-6">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Relaxed view: List items
              <ul className="divide-y divide-border rounded-md border">
                {activeFiltered.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">No active tasks.</li>
                )}
                {activeFiltered.map((t) => {
                  const struck = struckTodayIds.has(t.id);
                  return (
                    <li key={t.id} className="flex items-start gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-sm sm:text-base ${t.completed || struck ? "line-through text-muted-foreground" : ""}`}>
                              {t.title} {t.dueDate && <span className="ml-2 text-muted-foreground text-xs">(due {t.dueDate})</span>}{typeof t.dueHour === "number" && !t.dueDate && <span className="ml-2 text-muted-foreground text-xs">(due {t.dueHour}:00)</span>}
                            </p>
                            {t.notes && (
                              <p className={`mt-1 text-xs sm:text-sm ${t.completed || struck ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
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
                          <div className="flex items-center gap-1">
                            <Dialog open={strikeTaskId === t.id} onOpenChange={(open) => { if (!open) { setStrikeTaskId(null); setStrikeNote(""); } }}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={() => setStrikeTaskId(t.id)}>Strike</Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Strike "{t.title}"</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-2">
                                  <Label htmlFor={`strike-note-relax-${t.id}`}>Add note (optional)</Label>
                                  <Textarea id={`strike-note-relax-${t.id}`} value={strikeNote} onChange={(e) => setStrikeNote(e.target.value)} rows={3} placeholder="What did you do?" />
                                </div>
                                <DialogFooter className="gap-2 sm:gap-0">
                                  <Button variant="secondary" onClick={() => onStrikeToday(t.id)}>Strike for today</Button>
                                  <Button onClick={() => onMarkCompleted(t.id)}>Mark as completed</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="expired" className="mt-2">
            {compact ? (
              // Compact view: Small cards in grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {expiredFiltered.length === 0 && (
                  <p className="text-muted-foreground p-3 text-xs col-span-full">No expired tasks.</p>
                )}
                {expiredFiltered.map((t) => (
                  <div key={t.id} className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="space-y-2">
                      <p className="text-xs font-medium line-clamp-2 text-destructive">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Due: {t.dueDate ?? `${t.dueHour}:00`}
                      </p>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {t.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px]">#{tag}</span>
                          ))}
                          {t.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{t.tags.length - 2}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1 pt-1">
                        <Dialog open={strikeTaskId === t.id} onOpenChange={(open) => { if (!open) { setStrikeTaskId(null); setStrikeNote(""); } }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={() => setStrikeTaskId(t.id)} className="h-6 text-[10px] flex-1">Strike</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Strike "{t.title}"</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-2">
                              <Label htmlFor={`strike-note-exp-${t.id}`}>Add note (optional)</Label>
                              <Textarea id={`strike-note-exp-${t.id}`} value={strikeNote} onChange={(e) => setStrikeNote(e.target.value)} rows={3} placeholder="What did you do?" />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                              <Button variant="secondary" onClick={() => onStrikeToday(t.id)}>Strike for today</Button>
                              <Button onClick={() => onMarkCompleted(t.id)}>Mark as completed</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task" className="h-6 w-6">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Relaxed view: List items
              <ul className="divide-y divide-border rounded-md border">
                {expiredFiltered.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">No expired tasks.</li>
                )}
                {expiredFiltered.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base text-destructive">{t.title} <span className="ml-2 text-muted-foreground text-xs">(due {t.dueDate ?? `${t.dueHour}:00`})</span></p>
                          {t.notes && (
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.notes}</p>
                          )}
                          {t.tags && t.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {t.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[11px]">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Dialog open={strikeTaskId === t.id} onOpenChange={(open) => { if (!open) { setStrikeTaskId(null); setStrikeNote(""); } }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="secondary" onClick={() => setStrikeTaskId(t.id)}>Strike</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Strike "{t.title}"</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-2">
                                <Label htmlFor={`strike-note-exp-relax-${t.id}`}>Add note (optional)</Label>
                                <Textarea id={`strike-note-exp-relax-${t.id}`} value={strikeNote} onChange={(e) => setStrikeNote(e.target.value)} rows={3} placeholder="What did you do?" />
                              </div>
                              <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="secondary" onClick={() => onStrikeToday(t.id)}>Strike for today</Button>
                                <Button onClick={() => onMarkCompleted(t.id)}>Mark as completed</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
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

          <TabsContent value="completed" className="mt-2">
            {compact ? (
              // Compact view: Small cards in grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {completedFiltered.length === 0 && (
                  <p className="text-muted-foreground p-3 text-xs col-span-full">No completed tasks.</p>
                )}
                {completedFiltered.map((t) => (
                  <div key={t.id} className="p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div className="space-y-2">
                      <p className="text-xs font-medium line-clamp-2 line-through text-muted-foreground">{t.title}</p>
                      {t.tags && t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {t.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[9px] line-through">#{tag}</span>
                          ))}
                          {t.tags.length > 2 && <span className="text-[9px] text-muted-foreground">+{t.tags.length - 2}</span>}
                        </div>
                      )}
                      <div className="flex items-center justify-end pt-1">
                        <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task" className="h-6 w-6">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Relaxed view: List items
              <ul className="divide-y divide-border rounded-md border">
                {completedFiltered.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">No completed tasks.</li>
                )}
                {completedFiltered.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-through text-muted-foreground text-sm sm:text-base">{t.title}</p>
                          {t.notes && (
                            <p className="mt-1 text-xs sm:text-sm line-through text-muted-foreground">{t.notes}</p>
                          )}
                          {t.tags && t.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {t.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground line-through text-[11px]">#{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)} aria-label="Delete task">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};