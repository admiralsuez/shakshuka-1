"use client";

import { useState, useEffect } from "react";
import { Counters } from "@/components/widgets/Counters";
import { Tasks } from "@/components/tasks/Tasks";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";

const quirkyNicknames = [
  "Task Master",
  "Productivity Ninja",
  "Strike Champion",
  "Goal Crusher",
  "Daily Dynamo",
  "Achievement Hunter",
  "Progress Warrior",
  "Focus Wizard",
  "Victory Seeker",
  "Success Samurai"
];

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"relaxed" | "compact">("relaxed");
  const [greeting, setGreeting] = useState("Dashboard");

  useEffect(() => {
    const userName = localStorage.getItem("userName");
    
    if (userName) {
      // Use custom name with time-based greeting
      const hour = new Date().getHours();
      let timeGreeting = "Good evening";
      if (hour < 12) timeGreeting = "Good morning";
      else if (hour < 18) timeGreeting = "Good afternoon";
      
      setGreeting(`${timeGreeting}, ${userName}!`);
    } else {
      // Use random quirky nickname
      const randomIndex = Math.floor(Math.random() * quirkyNicknames.length);
      const nickname = quirkyNicknames[randomIndex];
      setGreeting(`Hey there, ${nickname}!`);
    }
  }, []);

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* decorative gradients - hidden on mobile */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-2xl hidden lg:block"
          style={{
            background: 'radial-gradient(closest-side, oklch(0.66 0.2 250 / 0.25), transparent)'
          }} />

        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-2xl hidden lg:block"
          style={{
            background: 'radial-gradient(closest-side, oklch(0.72 0.15 160 / 0.20), transparent)'
          }} />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 animate-in fade-in-50 mb-4 sm:mb-6">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight break-words">
              <span style={{
                background: 'linear-gradient(to right, oklch(0.66 0.2 250), oklch(0.72 0.15 160), oklch(0.8 0.2 140))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}>
                {greeting}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Track your daily strikes, monitor progress, and manage tasks.</p>
          </div>
        </div>

        <section className="rounded-lg sm:rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6"
          style={{
            background: 'linear-gradient(to bottom right, oklch(0.66 0.2 250 / 0.1), oklch(0.7 0.11 35 / 0.1), oklch(0.8 0.2 140 / 0.1))'
          }}>
          <h2 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.66 0.2 250)' }} />
            Quick stats
          </h2>
          <Counters />
        </section>

        <section className="rounded-lg sm:rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-3 sm:p-4 md:p-6"
          style={{
            background: 'linear-gradient(to bottom right, oklch(0.74 0.2 310 / 0.1), oklch(0.72 0.15 160 / 0.1), oklch(0.7 0.11 35 / 0.1))'
          }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <span className="inline-block h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.74 0.2 310)' }} />
              Your tasks
            </h2>
            
            {/* View Toggle */}
            <div className="flex items-center gap-1 rounded-md border bg-card p-1 w-fit">
              <Button
                size="sm"
                variant={viewMode === "relaxed" ? "secondary" : "ghost"}
                onClick={() => setViewMode("relaxed")}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                aria-label="Relaxed view">
                <LayoutList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                onClick={() => setViewMode("compact")}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                aria-label="Compact view">
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          <Tasks compact={viewMode === "compact"} />
        </section>
      </div>
    </div>
  );
}