import { NextRequest, NextResponse } from 'next/server';

// Force static generation for Tauri compatibility
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    // Always return empty object since we're using local storage
    console.log("📦 Using local storage, returning empty settings");
    return NextResponse.json({});
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Always return success since we're using local storage
    console.log("📦 Using local storage, accepting settings but not persisting");
    return NextResponse.json({ ok: true, message: "Using local storage - settings not persisted to database" });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}