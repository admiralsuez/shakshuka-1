"use client";

import { useState } from "react";
import { Counters } from "@/components/widgets/Counters";
import { Tasks } from "@/components/tasks/Tasks";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"relaxed" | "compact">("relaxed");

  return (
    <div className="relative mx-auto w-full max-w-5xl p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden">
      {/* decorative gradients */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-2xl"
        style={{
          background: 'radial-gradient(closest-side, oklch(0.66 0.2 250 / 0.25), transparent)'
        }} />

      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-2xl"
        style={{
          background: 'radial-gradient(closest-side, oklch(0.72 0.15 160 / 0.20), transparent)'
        }} />


      <div className="flex items-start justify-between gap-4 animate-in fade-in-50">
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            <span style={{
              background: 'linear-gradient(to right, oklch(0.66 0.2 250), oklch(0.72 0.15 160), oklch(0.8 0.2 140))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              Dashboard
            </span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Track your daily strikes, monitor progress, and manage tasks.</p>
        </div>
      </div>

      <section className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-4 md:p-6 !w-[821px] !h-[199px]"
      style={{
        background: 'linear-gradient(to bottom right, oklch(0.66 0.2 250 / 0.1), oklch(0.7 0.11 35 / 0.1), oklch(0.8 0.2 140 / 0.1))'
      }}>

        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.66 0.2 250)' }} />
          Quick stats
        </h2>
        <Counters />
      </section>

      <section className="rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 p-4 md:p-6 !w-[823px] !h-[387px]"
      style={{
        background: 'linear-gradient(to bottom right, oklch(0.74 0.2 310 / 0.1), oklch(0.72 0.15 160 / 0.1), oklch(0.7 0.11 35 / 0.1))'
      }}>

        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'oklch(0.74 0.2 310)' }} />
            Your tasks
          </h2>
          
          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-md border bg-card p-1">
            <Button
              size="sm"
              variant={viewMode === "relaxed" ? "secondary" : "ghost"}
              onClick={() => setViewMode("relaxed")}
              className="h-8 w-8 p-0"
              aria-label="Relaxed view">

              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "compact" ? "secondary" : "ghost"}
              onClick={() => setViewMode("compact")}
              className="h-8 w-8 p-0"
              aria-label="Compact view">

              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Tasks compact={viewMode === "compact"} />
      </section>
    </div>);

}