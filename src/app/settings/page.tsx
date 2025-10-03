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
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const s = await loadSettings();
        const name = localStorage.getItem("userName") || "";
        const color = localStorage.getItem("favoriteColor") || "#007AFF";
        
        if (mounted) {
          setSettings({ ...s, buttonColor: color });
          setUserName(name);
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

  // Apply button color instantly as user changes it
  useEffect(() => {
    if (settings.buttonColor) {
      document.documentElement.style.setProperty('--user-button-color', settings.buttonColor);
    }
  }, [settings.buttonColor]);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      
      // Save user name and color
      if (userName.trim()) {
        localStorage.setItem("userName", userName.trim());
      }
      localStorage.setItem("favoriteColor", settings.buttonColor || "#007AFF");
      
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-3xl space-y-4 sm:space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Customize your Shakshuka experience</p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid gap-2 w-full">
              <Label htmlFor="userName" className="text-sm">Your Name</Label>
              <Input
                id="userName"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                This name will be used in greetings and throughout the app.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Daily Reset</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid gap-2 w-full">
              <Label htmlFor="resetHour" className="text-sm">Reset Hour</Label>
              <select
                id="resetHour"
                value={settings.resetHour}
                onChange={(e) => setSettings((s) => ({ ...s, resetHour: Number(e.target.value) }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? "12:00 AM (Midnight)" : 
                     i < 12 ? `${i}:00 AM` : 
                     i === 12 ? "12:00 PM (Noon)" : 
                     `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Tasks will reset at this time daily.
              </p>
            </div>
            <div className="grid gap-2 w-full">
              <Label htmlFor="timezone" className="text-sm">Timezone (IANA)</Label>
              <Input
                id="timezone"
                placeholder="e.g. America/New_York, Europe/London"
                value={settings.timezone}
                onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Used to determine day boundaries and reset timing.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            <div className="grid gap-2 w-full">
              <Label htmlFor="buttonColor" className="text-sm">Accent Color</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  id="buttonColor"
                  type="color"
                  value={settings.buttonColor || "#007AFF"}
                  onChange={(e) => setSettings((s) => ({ ...s, buttonColor: e.target.value }))}
                  className="h-10 w-full sm:w-20 rounded-md border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={settings.buttonColor || "#007AFF"}
                  onChange={(e) => setSettings((s) => ({ ...s, buttonColor: e.target.value }))}
                  placeholder="#007AFF"
                  className="flex-1 w-full"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a custom accent color. Changes apply instantly as preview.
              </p>
            </div>

            {/* Preview Section */}
            <div className="pt-4 border-t">
              <Label className="text-sm mb-3 block">Preview</Label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button size="sm" style={{ backgroundColor: settings.buttonColor, color: 'white' }}>
                  Primary Button
                </Button>
                <Button size="sm" variant="outline" style={{ borderColor: settings.buttonColor, color: settings.buttonColor }}>
                  Outlined Button
                </Button>
                <div className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: settings.buttonColor + '20', color: settings.buttonColor }}>
                  Badge
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button onClick={onSave} disabled={saving} style={{ backgroundColor: settings.buttonColor, color: 'white' }} className="w-full sm:w-auto">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          {saving && <span className="text-sm text-muted-foreground text-center sm:text-left">Saving changes...</span>}
        </div>
      </div>
    </div>
  );
}