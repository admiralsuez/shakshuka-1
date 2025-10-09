import { NextRequest, NextResponse } from 'next/server';

// Force static generation for Tauri compatibility
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    // Always return empty counters since we're using local storage
    console.log("📦 Using local storage, returning empty counters");
    return NextResponse.json({
      strikes: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      monthlyStats: []
    });
  } catch (error) {
    console.error('Error fetching counters:', error);
    return NextResponse.json({ error: 'Failed to fetch counters' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Always return success since we're using local storage
    console.log("📦 Using local storage, accepting counter updates but not persisting");
    return NextResponse.json({ ok: true, message: "Using local storage - counters not persisted to database" });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}