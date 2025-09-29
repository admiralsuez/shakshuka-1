"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadSettings, saveSettings, type AppSettings } from "@/lib/local-storage";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ resetHour: 9, timezone: "UTC" });
  const [saving, setSaving] = useState(false);
  // theme (client-only, stored in localStorage)
  const [theme, setTheme] = useState<string>("");

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      // initialize theme from localStorage
      try {
        const stored = localStorage.getItem("theme") || "modern"; // default to "modern"
        setTheme(stored);
      } catch {}
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
  };

  // apply theme immediately when changed
  useEffect(() => {
    try {
      const cls = document.documentElement.classList;
      cls.remove("dark");
      cls.remove("modern");
      if (theme === "dark") cls.add("dark");
      if (theme === "modern") cls.add("modern");
      if (theme) {
        localStorage.setItem("theme", theme);
      } else {
        localStorage.removeItem("theme");
      }
    } catch {}
  }, [theme]);

  return (
    <div className="mx-auto w-full max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Daily Reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="resetHour">Reset hour (0-23)</Label>
            <Input
              id="resetHour"
              inputMode="numeric"
              value={String(settings.resetHour)}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                const n = Math.max(0, Math.min(23, parseInt(v || "0", 10)));
                setSettings((s) => ({ ...s, resetHour: Number.isNaN(n) ? 0 : n }));
              }}
            />
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
              Used to determine day boundaries and 9am (or your custom) reset.
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="theme">Theme</Label>
            <select
              id="theme"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="modern">Modern</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="text-xs text-muted-foreground">Choose "Modern" for clean, iOS-style colors and rounded shapes.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}