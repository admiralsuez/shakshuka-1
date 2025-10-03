"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadSettings, saveSettings, type AppSettings, loadStrikes, loadUpdates, loadUsedMessages, saveStrikes, saveUpdates, saveUsedMessages } from "@/lib/local-storage";
import { toast } from "sonner";
import { Download, Upload, RefreshCw } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { readTextFile, writeTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

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

async function fetchTasksTauri() {
  try {
    const available = await isTauri();
    if (!available) return [];
    const fileExists = await exists(TASKS_FILE, { baseDir: BaseDirectory.AppData });
    if (!fileExists) return [];
    const text = await readTextFile(TASKS_FILE, { baseDir: BaseDirectory.AppData });
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchTasksAPI() {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
    const res = await fetch("/api/tasks", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

async function saveTasksTauri(tasks: any[]) {
  try {
    const available = await isTauri();
    if (!available) return;
    await writeTextFile(TASKS_FILE, JSON.stringify(tasks, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch {
    // ignore
  }
}

async function saveTasksAPI(tasks: any[]) {
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

async function exportData() {
  try {
    const [tasks, settings, strikes, updates, usedMessages] = await Promise.all([
      (await isTauri()) ? fetchTasksTauri() : fetchTasksAPI(),
      loadSettings(),
      loadStrikes(),
      loadUpdates(),
      loadUsedMessages()
    ]);
    
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      tasks,
      settings,
      strikes,
      updates,
      usedMessages
    };
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
}

async function importData(data: any) {
  try {
    if (!data || !data.version || !Array.isArray(data.tasks)) {
      throw new Error("Invalid import data format");
    }
    
    if ((await isTauri())) {
      await saveTasksTauri(data.tasks);
    } else {
      await saveTasksAPI(data.tasks);
    }
    
    if (data.settings) await saveSettings(data.settings);
    if (data.strikes) await saveStrikes(data.strikes);
    if (data.updates) await saveUpdates(data.updates);
    if (data.usedMessages) await saveUsedMessages(data.usedMessages);
    
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ 
    resetHour: 9, 
    timezone: "UTC",
    buttonColor: "#007AFF",
    showPomodoroTimer: true
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTauriApp, setIsTauriApp] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const [s, tauri] = await Promise.all([
          loadSettings(),
          isTauri()
        ]);
        if (mounted) {
          setSettings(s);
          setIsTauriApp(tauri);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success("Settings saved successfully! Refresh to see changes.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      
      const newSettings = await loadSettings();
      setSettings(newSettings);
      
      toast.success("Data imported successfully! Page will reload.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error("Import failed. Please check the file format.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCheckForUpdates = async () => {
    if (!isTauriApp) {
      toast.error("Updates are only available in the desktop app");
      return;
    }

    setChecking(true);
    try {
      const update = await check();
      
      if (update?.available) {
        toast.success(`Update available: v${update.version}`);
        
        // Ask user if they want to install
        const install = confirm(`A new version (v${update.version}) is available. Install now?\n\nThe app will restart after installation.`);
        
        if (install) {
          setUpdating(true);
          toast.info("Downloading update...");
          
          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case "Started":
                toast.info(`Downloading ${event.data.contentLength} bytes`);
                break;
              case "Progress":
                const percent = Math.round((event.data.chunkLength / event.data.contentLength!) * 100);
                console.log(`Downloaded ${percent}%`);
                break;
              case "Finished":
                toast.success("Update downloaded! Restarting...");
                break;
            }
          });
          
          // Restart the app
          await relaunch();
        }
      } else {
        toast.success("You're running the latest version!");
      }
    } catch (error) {
      console.error("Update check failed:", error);
      toast.error("Failed to check for updates. Please try again later.");
    } finally {
      setChecking(false);
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      
      {isTauriApp && (
        <Card>
          <CardHeader>
            <CardTitle>App Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleCheckForUpdates} 
                disabled={checking || updating}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? "Checking..." : updating ? "Installing..." : "Check for Updates"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Check for and install app updates automatically. The app will restart after installation.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Export your tasks, strikes, and settings as a JSON backup. Import to restore from a previous backup.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="userName">Your Name (optional)</Label>
            <Input
              id="userName"
              placeholder="What should we call you?"
              value={settings.userName || ""}
              onChange={(e) => setSettings((s) => ({ ...s, userName: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Used in dashboard greetings. Leave empty for quirky nicknames!
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Daily Reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="resetHour">Reset hour</Label>
            <select
              id="resetHour"
              value={settings.resetHour}
              onChange={(e) => setSettings((s) => ({ ...s, resetHour: Number(e.target.value) }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              When should your tasks refresh each day?
            </p>
          </div>
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="timezone">Timezone (IANA)</Label>
            <Input
              id="timezone"
              placeholder="e.g. Europe/London"
              value={settings.timezone}
              onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Used to determine day boundaries and reset time.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="buttonColor">Button Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="buttonColor"
                type="color"
                value={settings.buttonColor || "#007AFF"}
                onChange={(e) => setSettings((s) => ({ ...s, buttonColor: e.target.value }))}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                type="text"
                value={settings.buttonColor || "#007AFF"}
                onChange={(e) => setSettings((s) => ({ ...s, buttonColor: e.target.value }))}
                placeholder="#007AFF"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a custom color for buttons throughout the app.
            </p>
          </div>

          <div className="grid gap-2 max-w-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showPomodoroTimer"
                checked={settings.showPomodoroTimer !== false}
                onChange={(e) => setSettings((s) => ({ ...s, showPomodoroTimer: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="showPomodoroTimer" className="cursor-pointer">
                Show Pomodoro Timer
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Display a mini pomodoro timer on the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}