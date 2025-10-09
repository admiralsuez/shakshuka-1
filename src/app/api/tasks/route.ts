import { NextRequest, NextResponse } from 'next/server';

// Force static generation for Tauri compatibility
export const dynamic = 'force-static';

export type Task = {
  id: string;
  revision: number;
  title: string;
  notes?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  dueHour?: number;
  dueDate?: string;
  tags?: string[];
};

export async function GET() {
  try {
    // Always return empty array since we're using local storage
    console.log("📦 Using local storage, returning empty array");
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// Replace all tasks (overwrite persistence model)
export async function PUT(request: NextRequest) {
  try {
    // Always return success since we're using local storage
    console.log("📦 Using local storage, accepting tasks but not persisting");
    return NextResponse.json({ ok: true, message: "Using local storage - tasks not persisted to database" });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}