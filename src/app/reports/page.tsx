"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadSettings, loadStrikes, type StrikeEntry, formatDateInTZ, isTauri } from "@/lib/local-storage";
import { readTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";

// Minimal task shape
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

export default function ReportsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [strikes, setStrikes] = useState<StrikeEntry[]>([]);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [resetHour, setResetHour] = useState<number>(9);
  const [dateFilter, setDateFilter] = useState<string>(""); // YYYY-MM-DD

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [s, st, t] = await Promise.all([loadSettings(), loadStrikes(), loadTasks()]);
      if (!mounted) return;
      setTimezone(s.timezone);
      setResetHour(s.resetHour);
      setStrikes(st);
      setTasks(t);
      // default to today in user TZ
      setDateFilter(formatDateInTZ(Date.now(), s.timezone));
    })();
    return () => { mounted = false; };
  }, []);

  // month key adjusted by resetHour
  const now = new Date();
  const monthKey = useMemo(() => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(now);
    let y = parseInt(parts.find(p => p.type === "year")?.value || "0");
    let m = parseInt(parts.find(p => p.type === "month")?.value || "1");
    const d = parseInt(parts.find(p => p.type === "day")?.value || "1");
    const h = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    if (d === 1 && h < resetHour) {
      m = m === 1 ? 12 : m - 1;
      if (m === 12) y -= 1;
    }
    return `${y}-${String(m).padStart(2, "0")}`;
  }, [timezone, resetHour]);

  const inMonth = (dateStr: string) => dateStr.slice(0, 7) === monthKey;

  // Month aggregates
  const monthStrikes = useMemo(() => strikes.filter(s => s.action === "strike" && inMonth(s.date)).length, [strikes, monthKey]);
  const monthCompleted = useMemo(() => strikes.filter(s => s.action === "completed" && inMonth(s.date)).length, [strikes, monthKey]);
  const monthExpired = useMemo(() => strikes.filter(s => s.action === "expired" && inMonth(s.date)).length, [strikes, monthKey]);

  // Totals-to-date
  const totalTasksAdded = tasks.length;
  const totalStrikes = strikes.filter(s => s.action === "strike").length;
  const totalCompleted = strikes.filter(s => s.action === "completed").length;

  // Day filter
  const dayEntries = useMemo(() => strikes.filter(s => !dateFilter || s.date === dateFilter), [strikes, dateFilter]);

  // Tasks added this month
  const tasksAddedThisMonth = useMemo(() => {
    return tasks.filter(t => {
      const d = formatDateInTZ(t.createdAt, timezone); // YYYY-MM-DD
      return inMonth(d);
    }).length;
  }, [tasks, timezone, monthKey]);

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-5xl space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-semibold">Reports</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Striked (month)</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{monthStrikes}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Completed (month)</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{monthCompleted}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Expired (month)</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{monthExpired}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Tasks added (month)</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{tasksAddedThisMonth}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Total tasks</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{totalTasksAdded}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Total strikes</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{totalStrikes}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col gap-2">
                <div className="text-xs sm:text-sm text-muted-foreground">Total completed</div>
                <Badge variant="secondary" className="text-sm sm:text-base w-fit">{totalCompleted}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Daily detail</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid gap-2 w-full sm:max-w-xs">
              <Label htmlFor="date" className="text-sm">Date</Label>
              <Input id="date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full" />
            </div>
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="grid grid-cols-4 px-3 py-2 text-xs text-muted-foreground border-b bg-muted/50">
                    <div>Time</div>
                    <div>Task</div>
                    <div>Action</div>
                    <div>Note</div>
                  </div>
                  <ScrollArea className="max-h-[360px]">
                    {dayEntries.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">No entries for this date.</div>
                    ) : (
                      <ul>
                        {dayEntries
                          .sort((a, b) => a.ts - b.ts)
                          .map((e, idx) => {
                            const time = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(e.ts));
                            return (
                              <li key={idx} className="grid grid-cols-4 px-3 py-2 text-sm border-b last:border-b-0">
                                <div className="tabular-nums">{time}</div>
                                <div className="truncate">{e.taskId}</div>
                                <div className="capitalize">{e.action || "strike"}</div>
                                <div className="truncate text-muted-foreground">{e.note || "-"}</div>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}