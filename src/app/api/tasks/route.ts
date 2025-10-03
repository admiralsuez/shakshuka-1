import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { like } from 'drizzle-orm';

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
    // For now, use hardcoded userId = 1 until auth is implemented
    // We'll filter tasks by using a prefix in the task ID: "user1-" for user 1
    const userId = 1;
    const userPrefix = `user${userId}-%`;
    
    const userTasks = await db.select().from(tasks)
      .where(like(tasks.id, userPrefix));
    
    // Transform database records to API format with safe JSON parsing
    const transformedTasks: Task[] = userTasks.map(task => {
      let parsedTags;
      try {
        parsedTags = task.tags ? JSON.parse(task.tags) : undefined;
      } catch (e) {
        // If JSON parsing fails, treat as undefined
        parsedTags = undefined;
      }

      return {
        id: String(task.id),
        revision: Number(task.revision) || 1, // Handle corrupted data
        title: task.title,
        notes: task.notes || undefined,
        completed: Boolean(task.completed),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        dueHour: task.dueHour || undefined,
        dueDate: task.dueDate || undefined,
        tags: Array.isArray(parsedTags) ? parsedTags : undefined,
      };
    });

    return NextResponse.json(transformedTasks);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

// Replace all tasks (overwrite persistence model)
export async function PUT(request: NextRequest) {
  try {
    // For now, use hardcoded userId = 1 until auth is implemented
    const userId = 1;
    const userPrefix = `user${userId}-`;
    
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ 
        error: "Expected an array of tasks",
        code: "INVALID_PAYLOAD" 
      }, { status: 400 });
    }

    // Clear only the current user's tasks (by ID prefix)
    try {
      const userPrefixPattern = `user${userId}-%`;
      await db.delete(tasks).where(like(tasks.id, userPrefixPattern));
    } catch (deleteError) {
      console.warn('Delete failed:', deleteError);
    }

    // If empty array, just return success
    if (body.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Validate and normalize tasks
    const normalizedTasks = body.map((t: any) => {
      if (!t.id || typeof t.id !== 'string') {
        throw new Error('Task ID is required and must be a string');
      }
      if (!t.title || typeof t.title !== 'string') {  
        throw new Error('Task title is required and must be a string');
      }

      const now = Date.now();
      
      // Ensure task ID has user prefix for isolation
      let taskId = String(t.id);
      if (!taskId.startsWith(userPrefix)) {
        taskId = userPrefix + taskId;
      }
      
      return {
        id: taskId,
        revision: Number(t.revision) || 1,
        title: String(t.title),
        notes: t.notes ? String(t.notes) : null,
        completed: t.completed ? 1 : 0,
        createdAt: Number(t.createdAt) || now,
        updatedAt: Number(t.updatedAt) || now,
        dueHour: (Number.isInteger(t?.dueHour) && t.dueHour >= 0 && t.dueHour <= 23) ? Number(t.dueHour) : null,
        dueDate: (typeof t?.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)) ? t.dueDate : null,
        tags: (Array.isArray(t.tags) && t.tags.length > 0) ? JSON.stringify(t.tags) : null,
      };
    });

    // Insert new tasks with user prefix for isolation
    if (normalizedTasks.length > 0) {
      await db.insert(tasks).values(normalizedTasks);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}