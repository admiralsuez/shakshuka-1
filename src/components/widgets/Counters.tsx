"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isTauri } from "@/lib/local-storage";
import { loadSettings, loadStrikes, saveStrikes, type StrikeEntry, formatDateInTZ } from "@/lib/local-storage";
import { readTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";

// Mirror of Task type (subset) to avoid import cycle
interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  dueHour?: number;
  dueDate?: string; // YYYY-MM-DD optional absolute due date
}

const TASKS_FILE = "tasks.json";

async function loadTasks(): Promise<Task[]> {
  try {
    const tauri = await isTauri();
    if (tauri) {
      const ok = await exists(TASKS_FILE, { baseDir: BaseDirectory.App });
      if (!ok) return [];
      const txt = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.App });
      const data = JSON.parse(txt);
      return Array.isArray(data) ? (data as Task[]) : [];
    } else {
      const res = await fetch("/api/tasks");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as Task[]) : [];
    }
  } catch {
    return [];
  }
}

export const Counters = ({ compact = false }: { compact?: boolean }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [strikes, setStrikes] = useState<StrikeEntry[]>([]);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [resetHour, setResetHour] = useState<number>(9);

  // Load initial data
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [s, st, t] = await Promise.all([loadSettings(), loadStrikes(), loadTasks()]);
      if (!mounted) return;
      setTimezone(s.timezone);
      setResetHour(s.resetHour);
      setStrikes(st);
      setTasks(t);
    })();
    return () => { mounted = false; };
  }, []);

  // Listen for strikes-updated events and refresh data
  useEffect(() => {
    const handleStrikesUpdated = async () => {
      const [st, t] = await Promise.all([loadStrikes(), loadTasks()]);
      setStrikes(st);
      setTasks(t);
    };

    window.addEventListener("strikes-updated", handleStrikesUpdated);
    return () => window.removeEventListener("strikes-updated", handleStrikesUpdated);
  }, []);

  const now = new Date();
  const today = useMemo(() => formatDateInTZ(now.getTime(), timezone), [now, timezone]);
  const hour = now.getHours();

  // month key adjusted for resetHour at 9am: if before reset on day 1, count for previous month
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
  }, [timezone, resetHour, now]);

  const inMonth = (dateStr: string) => dateStr.slice(0, 7) === monthKey;

  const strikesThisMonth = useMemo(() => strikes.filter(s => s.action === "strike" && inMonth(s.date)).length, [strikes, monthKey]);
  const completedThisMonth = useMemo(() => strikes.filter(s => s.action === "completed" && inMonth(s.date)).length, [strikes, monthKey]);

  const expiredNow = useMemo(() => {
    const todayStr = today;
    const hourNow = hour;
    return tasks.filter(t => {
      if (t.completed) return false;
      const struck = strikes.some(s => s.taskId === t.id && s.date === todayStr && s.action !== "expired");
      if (struck) return false;
      // Prefer absolute dueDate if present
      if (t.dueDate) {
        return todayStr > t.dueDate; // expired if today is after due date
      }
      if (t.dueHour == null) return false;
      return hourNow >= (t.dueHour as number);
    }).length;
  }, [tasks, strikes, today, hour]);

  // Record expired tasks once per day for history (for reports)
  useEffect(() => {
    (async () => {
      if (!timezone) return;
      const todayStr = today;
      const hourNow = hour;
      const expiredTaskIds = tasks
        .filter(t => !t.completed)
        .filter(t => {
          // Prefer absolute dueDate
          if (t.dueDate) return todayStr > t.dueDate;
          if (typeof t.dueHour === "number") return hourNow >= (t.dueHour as number);
          return false;
        })
        .filter(t => !strikes.some(s => s.taskId === t.id && s.date === todayStr && s.action !== "expired"))
        .map(t => t.id);

      // avoid duplicate expired entries for today
      const alreadyLogged = new Set(
        strikes.filter(s => s.date === todayStr && s.action === "expired").map(s => s.taskId)
      );
      const toLog = expiredTaskIds.filter(id => !alreadyLogged.has(id));
      if (toLog.length === 0) return;

      const newEntries: StrikeEntry[] = toLog.map(taskId => ({
        taskId,
        date: todayStr,
        ts: Date.now(),
        action: "expired",
      }));
      const next = [...strikes, ...newEntries];
      setStrikes(next);
      await saveStrikes(next);
    })();
    // only rerun when day/hour/tasks or strikes change materially
  }, [tasks, timezone, today, hour, strikes]);

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 w-full max-w-3xl ${
      compact ? "gap-2" : "gap-3"
    }`}>
      <Card>
        <CardContent className={compact ? "p-3" : "p-4 flex items-center justify-between"}>
          <div className={`text-muted-foreground ${compact ? "text-xs mb-1" : "text-sm"}`}>Striked (month)</div>
          <Badge variant="secondary" className={compact ? "text-sm" : "text-base"}>{strikesThisMonth}</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={compact ? "p-3" : "p-4 flex items-center justify-between"}>
          <div className={`text-muted-foreground ${compact ? "text-xs mb-1" : "text-sm"}`}>Expired (today)</div>
          <Badge variant="secondary" className={compact ? "text-sm" : "text-base"}>{expiredNow}</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={compact ? "p-3" : "p-4 flex items-center justify-between"}>
          <div className={`text-muted-foreground ${compact ? "text-xs mb-1" : "text-sm"}`}>Completed (month)</div>
          <Badge variant="secondary" className={compact ? "text-sm" : "text-base"}>{completedThisMonth}</Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default Counters;