"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadSettings, saveSettings, type AppSettings } from "@/lib/local-storage";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ 
    resetHour: 9, 
    timezone: "UTC",
    buttonColor: "#007AFF"
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const s = await loadSettings();
        if (mounted) {
          setSettings(s);
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
      // Trigger a page refresh to update greeting
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