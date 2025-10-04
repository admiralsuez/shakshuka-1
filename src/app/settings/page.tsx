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

/**
 * ============================================================================
 * DEVELOPER NOTES - Settings Page Architecture
 * ============================================================================
 * 
 * This page handles application settings, data import/export, and updates.
 * The app runs in TWO modes: Web (browser) and Desktop (Tauri app).
 * 
 * KEY SYSTEMS:
 * 1. Tauri Detection - Determines if running as desktop app or web
 * 2. Data Storage - Dual storage system (localStorage + Tauri filesystem OR API)
 * 3. Import/Export - Backup and restore all app data
 * 4. Auto Updates - Desktop app can check and install updates (Tauri only)
 * 5. Settings Management - User preferences with live reload
 * 
 * ============================================================================
 */

/**
 * TAURI DETECTION SYSTEM
 * ----------------------
 * Detects if the app is running as a Tauri desktop app vs web browser.
 * 
 * HOW IT WORKS:
 * - Tries to call getVersion() from Tauri API
 * - If successful → Desktop app (Tauri available)
 * - If fails → Web browser (Tauri not available)
 * 
 * USAGE:
 * - Controls which storage system to use (filesystem vs API)
 * - Shows/hides desktop-only features (updates, file operations)
 * - Determines data persistence strategy
 * 
 * @returns {Promise<boolean>} true if running in Tauri, false if web
 */
async function isTauri(): Promise<boolean> {
  try {
    await getVersion();
    return true;
  } catch {
    return false;
  }
}

/**
 * DUAL STORAGE SYSTEM
 * -------------------
 * The app supports TWO storage backends depending on runtime environment:
 * 
 * 1. TAURI (Desktop App):
 *    - Uses filesystem: BaseDirectory.AppData
 *    - Location: Platform-specific app data folder
 *      * Windows: %APPDATA%/com.shakshuka.app/
 *      * macOS: ~/Library/Application Support/com.shakshuka.app/
 *      * Linux: ~/.local/share/com.shakshuka.app/
 *    - File: tasks.json (for tasks data)
 *    - Benefits: Offline-first, no auth required, fast
 * 
 * 2. WEB (Browser):
 *    - Uses API routes: /api/tasks
 *    - Storage: Database via API + localStorage for settings
 *    - Requires: Bearer token authentication
 *    - Benefits: Sync across devices, cloud backup
 * 
 * IMPORTANT: Both systems must maintain compatible data formats!
 */

const TASKS_FILE = "tasks.json";

/**
 * Fetch tasks from Tauri filesystem (Desktop app only)
 * 
 * @returns {Promise<any[]>} Array of tasks or empty array if error/not found
 */
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

/**
 * Fetch tasks from API endpoint (Web version)
 * 
 * Uses bearer token authentication from localStorage.
 * Falls back to empty array on any error (network, auth, etc).
 * 
 * @returns {Promise<any[]>} Array of tasks from API or empty array
 */
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

/**
 * Save tasks to Tauri filesystem (Desktop app only)
 * 
 * @param {any[]} tasks - Array of task objects to save
 */
async function saveTasksTauri(tasks: any[]) {
  try {
    const available = await isTauri();
    if (!available) return;
    await writeTextFile(TASKS_FILE, JSON.stringify(tasks, null, 2), {
      baseDir: BaseDirectory.AppData,
    });
  } catch {
    // Silent fail - filesystem errors are non-critical
  }
}

/**
 * Save tasks to API endpoint (Web version)
 * 
 * @param {any[]} tasks - Array of task objects to save
 */
async function saveTasksAPI(tasks: any[]) {
  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
  await fetch("/api/tasks", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(tasks),
  }).catch(() => {
    // Silent fail - API errors handled by caller
  });
}

/**
 * DATA EXPORT SYSTEM
 * ------------------
 * Creates a complete backup of all app data in a portable JSON format.
 * 
 * EXPORTED DATA INCLUDES:
 * - tasks: All user tasks (from Tauri file OR API)
 * - settings: User preferences (resetHour, timezone, colors, etc)
 * - strikes: Strike history and counts
 * - updates: Update check history
 * - usedMessages: Motivational message tracking
 * 
 * FORMAT:
 * {
 *   version: "1.0",           // Schema version for compatibility
 *   exportedAt: "ISO date",   // Timestamp
 *   tasks: [...],
 *   settings: {...},
 *   strikes: {...},
 *   updates: {...},
 *   usedMessages: {...}
 * }
 * 
 * USE CASES:
 * - Manual backups before major changes
 * - Migrating between devices
 * - Data recovery
 * - Debugging/support
 * 
 * @returns {Promise<object>} Complete app data snapshot
 * @throws {Error} If data collection fails
 */
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

/**
 * DATA IMPORT SYSTEM
 * ------------------
 * Restores app data from an exported backup file.
 * 
 * VALIDATION:
 * - Checks for required fields: version, tasks array
 * - Gracefully handles missing optional data
 * - Overwrites existing data (use with caution!)
 * 
 * IMPORT PROCESS:
 * 1. Validate backup file structure
 * 2. Restore tasks to appropriate storage (Tauri file OR API)
 * 3. Restore localStorage data (settings, strikes, etc)
 * 4. Reload page to apply changes
 * 
 * IMPORTANT: This is a DESTRUCTIVE operation - all current data is replaced!
 * Consider adding a confirmation dialog before import.
 * 
 * @param {any} data - Parsed backup data object
 * @throws {Error} If data format is invalid or restore fails
 */
async function importData(data: any) {
  try {
    if (!data || !data.version || !Array.isArray(data.tasks)) {
      throw new Error("Invalid import data format");
    }
    
    // Restore tasks to appropriate storage backend
    if ((await isTauri())) {
      await saveTasksTauri(data.tasks);
    } else {
      await saveTasksAPI(data.tasks);
    }
    
    // Restore localStorage data
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
  const [totalSize, setTotalSize] = useState<number | null>(null);
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

  /**
   * TAURI AUTO-UPDATE SYSTEM
   * ------------------------
   * Desktop app only - checks for and installs app updates automatically.
   * 
   * HOW IT WORKS:
   * 1. Calls check() from @tauri-apps/plugin-updater
   * 2. Updater fetches update manifest from configured endpoint
   * 3. Compares manifest version with current app version
   * 4. If newer version available, prompts user to install
   * 5. Downloads update in background with progress tracking
   * 6. Installs update and restarts app
   * 
   * CONFIGURATION REQUIRED (src-tauri/tauri.conf.json):
   * {
   *   "updater": {
   *     "active": true,
   *     "endpoints": [
   *       "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
   *     ],
   *     "dialog": false,  // We handle UI ourselves
   *     "pubkey": "YOUR_PUBLIC_KEY"  // For signature verification
   *   }
   * }
   * 
   * UPDATE MANIFEST FORMAT (latest.json on GitHub):
   * {
   *   "version": "1.2.3",
   *   "notes": "What's new...",
   *   "pub_date": "2025-01-01T00:00:00Z",
   *   "platforms": {
   *     "darwin-x86_64": { "signature": "...", "url": "..." },
   *     "darwin-aarch64": { "signature": "...", "url": "..." },
   *     "linux-x86_64": { "signature": "...", "url": "..." },
   *     "windows-x86_64": { "signature": "...", "url": "..." }
   *   }
   * }
   * 
   * DEPLOYMENT WORKFLOW:
   * 1. Tag release in git: git tag v1.2.3 && git push --tags
   * 2. GitHub Actions builds app for all platforms
   * 3. Creates GitHub Release with binaries + latest.json
   * 4. Users click "Check for Updates" to get new version
   * 
   * SECURITY:
   * - Updates are cryptographically signed with pubkey
   * - Only installs if signature matches
   * - Prevents MITM attacks and tampering
   * 
   * PROGRESS TRACKING:
   * - Started: Download begins, shows file size
   * - Progress: Track download chunks (can show progress bar)
   * - Finished: Download complete, about to install
   * 
   * @async
   */
  const handleCheckForUpdates = async () => {
    if (!isTauriApp) {
      toast.error("Updates are only available in the desktop app");
      return;
    }

    setChecking(true);
    try {
      // Fetch update manifest from configured endpoint
      const update = await check();
      
      if (update?.available) {
        toast.success(`Update available: v${update.version}`);
        
        // Prompt user for installation confirmation
        const install = confirm(`A new version (v${update.version}) is available. Install now?\n\nThe app will restart after installation.`);
        
        if (install) {
          setUpdating(true);
          toast.info("Downloading update...");
          
          // Download and install with progress tracking
          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case "Started":
                setTotalSize(event.data.contentLength || null);
                toast.info(`Downloading ${event.data.contentLength || 0} bytes`);
                break;
              case "Progress":
                // Track download progress (can add progress bar here)
                const percent = totalSize ? Math.round((event.data.chunkLength / totalSize) * 100) : 0;
                console.log(`Downloaded ${percent}%`);
                break;
              case "Finished":
                toast.success("Update downloaded! Restarting...");
                break;
            }
          });
          
          // Restart app to complete installation
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
      
      {/* AUTO-UPDATE SECTION - Desktop App Only */}
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
      
      {/* DATA MANAGEMENT SECTION - Import/Export Backups */}
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