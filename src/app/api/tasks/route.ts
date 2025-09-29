import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  createdAt: number;
  // allow optional due hour for daily deadline (0-23)
  dueHour?: number;
  // optional absolute due date (epoch ms at start of day)
  dueAt?: number;
  // optional due date string (YYYY-MM-DD in user TZ)
  dueDate?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "tasks.json");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function readTasks(): Promise<Task[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: any) => typeof t?.id === "string" && typeof t?.title === "string");
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    return [];
  }
}

async function writeTasks(tasks: Task[]) {
  await ensureDir();
  await fs.writeFile(FILE_PATH, JSON.stringify(tasks, null, 2), "utf8");
}

export async function GET() {
  const tasks = await readTasks();
  return NextResponse.json(tasks);
}

// Overwrite all tasks (simple, resilient persistence model)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected an array of tasks" }, { status: 400 });
    }
    // Basic validation & normalization
    const tasks: Task[] = body.map((t: any) => ({
      id: String(t.id),
      title: String(t.title),
      notes: t.notes ? String(t.notes) : undefined,
      completed: Boolean(t.completed),
      createdAt: Number(t.createdAt ?? Date.now()),
      // keep optional dueHour when provided and valid
      ...(Number.isInteger(t?.dueHour) && t.dueHour >= 0 && t.dueHour <= 23 ? { dueHour: Number(t.dueHour) } : {}),
      // accept optional dueAt when provided and valid number
      ...(Number.isFinite(t?.dueAt) ? { dueAt: Number(t.dueAt) } : {}),
      // accept optional dueDate string (YYYY-MM-DD)
      ...(typeof t?.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? { dueDate: t.dueDate } : {}),
    }));

    await writeTasks(tasks);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}