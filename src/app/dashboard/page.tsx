import { Counters } from "@/components/widgets/Counters";
import { Tasks } from "@/components/tasks/Tasks";

export default function DashboardPage() {
  return (
    <div className="relative mx-auto w-full max-w-5xl p-6 space-y-6 overflow-hidden">
      {/* decorative gradients */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,theme(colors.chart-1)/25%,transparent)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,theme(colors.chart-4)/20%,transparent)] blur-2xl" />

      <div className="space-y-1 animate-in fade-in-50">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-4)] to-[var(--chart-2)] bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Track your daily strikes, monitor progress, and manage tasks.</p>
      </div>

      <section className="rounded-xl border bg-card p-4 md:p-6 shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 bg-gradient-to-br from-[var(--chart-1)]/10 via-[var(--chart-3)]/10 to-[var(--chart-2)]/10">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--chart-1)]" />
          Quick stats
        </h2>
        <Counters />
      </section>

      <section className="rounded-xl border bg-card p-4 md:p-6 shadow-sm animate-in fade-in-50 slide-in-from-bottom-2 bg-gradient-to-br from-[var(--chart-5)]/10 via-[var(--chart-4)]/10 to-[var(--chart-3)]/10">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--chart-5)]" />
          Your tasks
        </h2>
        <Tasks />
      </section>
    </div>
  );
}