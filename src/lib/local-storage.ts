"use client";

import { getVersion } from "@tauri-apps/api/app";
import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";

export async function isTauri(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  const tauri = await isTauri();
  if (tauri) {
    try {
      const fileExists = await exists(file, { baseDir: BaseDirectory.AppConfig });
      if (!fileExists) return fallback;
      const text = await readTextFile(file, { baseDir: BaseDirectory.AppConfig });
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  } else {
    try {
      const raw = localStorage.getItem(file);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}

async function writeJSON<T>(file: string, data: T): Promise<void> {
  const tauri = await isTauri();
  if (tauri) {
    try {
      await mkdir(".", { baseDir: BaseDirectory.AppConfig, recursive: true });
      await writeTextFile(file, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppConfig });
    } catch {}
  } else {
    try {
      localStorage.setItem(file, JSON.stringify(data));
    } catch {}
  }
}

export type StrikeEntry = {
  taskId: string;
  date: string; // YYYY-MM-DD in user TZ
  note?: string;
  ts: number; // epoch ms
  action?: "strike" | "completed" | "expired"; // include expired for reporting
};

export type TaskUpdate = {
  updateId: string; // UUID
  taskId: string;
  timestamp: number;
  diff: Record<string, { old: any; new: any }>; // what changed
  fullSnapshot: any; // complete task state after change
};

const STRIKES_FILE = "strikes.json";
const SETTINGS_KEY = "settings.json";
const UPDATES_FILE = "task-updates.json";
const USED_MESSAGES_KEY = "used-messages.json";

export type AppSettings = {
  resetHour: number; // 0-23
  timezone: string; // IANA
  buttonColor?: string; // hex color for buttons
  userName?: string; // user's custom name
  quirkyNicknameIndex?: number; // track which nickname was last used
  firstTimeSetupCompleted?: boolean; // track if setup dialog has been shown
  usedMessageIds?: string[]; // track which completion messages have been shown
  showPomodoroTimer?: boolean; // show pomodoro timer on dashboard
};

export async function loadSettings(): Promise<AppSettings> {
  return readJSON<AppSettings>(SETTINGS_KEY, { 
    resetHour: 9, 
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    buttonColor: "#007AFF" // iOS blue default
  });
}

export async function saveSettings(s: AppSettings) {
  await writeJSON<AppSettings>(SETTINGS_KEY, s);
}

export async function loadStrikes(): Promise<StrikeEntry[]> {
  return readJSON<StrikeEntry[]>(STRIKES_FILE, []);
}

export async function saveStrikes(entries: StrikeEntry[]) {
  await writeJSON<StrikeEntry[]>(STRIKES_FILE, entries);
}

export async function loadUpdates(): Promise<TaskUpdate[]> {
  return readJSON<TaskUpdate[]>(UPDATES_FILE, []);
}

export async function saveUpdates(updates: TaskUpdate[]) {
  await writeJSON<TaskUpdate[]>(UPDATES_FILE, updates);
}

export async function loadUsedMessages(): Promise<string[]> {
  return readJSON<string[]>(USED_MESSAGES_KEY, []);
}

export async function saveUsedMessages(ids: string[]) {
  await writeJSON<string[]>(USED_MESSAGES_KEY, ids);
}

export function formatDateInTZ(ts: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ts));
  const y = parts.find(p => p.type === "year")?.value || "0000";
  const m = parts.find(p => p.type === "month")?.value || "01";
  const d = parts.find(p => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}