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
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,theme(colors.chart-1)/25%,transparent)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,theme(colors.chart-4)/20%,transparent)] blur-2xl" />

      <div className="flex items-start justify-between gap-4 animate-in fade-in-50">
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-4)] to-[var(--chart-2)] bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Track your daily strikes, monitor progress, and manage tasks.</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-md border bg-card p-1">
          <Button
            size="sm"
            variant={viewMode === "relaxed" ? "secondary" : "ghost"}
            onClick={() => setViewMode("relaxed")}
            className="h-8 w-8 p-0"
            aria-label="Relaxed view"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === "compact" ? "secondary" : "ghost"}
            onClick={() => setViewMode("compact")}
            className="h-8 w-8 p-0"
            aria-label="Compact view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <section className={`rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 bg-gradient-to-br from-[var(--chart-1)]/10 via-[var(--chart-3)]/10 to-[var(--chart-2)]/10 ${
        viewMode === "compact" ? "p-3 md:p-4" : "p-4 md:p-6"
      }`}>
        <h2 className={`font-semibold mb-3 flex items-center gap-2 ${
          viewMode === "compact" ? "text-base" : "text-lg"
        }`}>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--chart-1)]" />
          Quick stats
        </h2>
        <Counters compact={viewMode === "compact"} />
      </section>

      <section className={`rounded-xl border bg-card shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 bg-gradient-to-br from-[var(--chart-5)]/10 via-[var(--chart-4)]/10 to-[var(--chart-3)]/10 ${
        viewMode === "compact" ? "p-3 md:p-4" : "p-4 md:p-6"
      }`}>
        <h2 className={`font-semibold mb-3 flex items-center gap-2 ${
          viewMode === "compact" ? "text-base" : "text-lg"
        }`}>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--chart-5)]" />
          Your tasks
        </h2>
        <Tasks compact={viewMode === "compact"} />
      </section>
    </div>
  );
}