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
      const fileExists = await exists(file, { baseDir: BaseDirectory.App });
      if (!fileExists) return fallback;
      const text = await readTextFile(file, { baseDir: BaseDirectory.App });
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
      await mkdir(".", { baseDir: BaseDirectory.App, recursive: true });
      await writeTextFile(file, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.App });
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

const STRIKES_FILE = "strikes.json";
const SETTINGS_KEY = "settings.json";

export type AppSettings = {
  resetHour: number; // 0-23
  timezone: string; // IANA
};

export async function loadSettings(): Promise<AppSettings> {
  return readJSON<AppSettings>(SETTINGS_KEY, { resetHour: 9, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
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

export function formatDateInTZ(ts: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(ts));
  const y = parts.find(p => p.type === "year")?.value || "0000";
  const m = parts.find(p => p.type === "month")?.value || "01";
  const d = parts.find(p => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}