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

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    await saveSettings(settings);
    setSaving(false);
    toast.success("Settings saved successfully!");
  };

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
          <div className="pt-2">
            <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}