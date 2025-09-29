import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if settings exist (userId null for single-user app)
    const existingSettings = await db.select()
      .from(settings)
      .where(isNull(settings.userId))
      .limit(1);

    if (existingSettings.length > 0) {
      return NextResponse.json(existingSettings[0]);
    }

    // No settings exist, create default settings
    const defaultSettings = {
      userId: null,
      resetHour: 9,
      timezone: 'UTC',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const newSettings = await db.insert(settings)
      .values(defaultSettings)
      .returning();

    return NextResponse.json(newSettings[0]);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { resetHour, timezone } = body;

    // Validate resetHour if provided
    if (resetHour !== undefined) {
      if (typeof resetHour !== 'number' || resetHour < 0 || resetHour > 23 || !Number.isInteger(resetHour)) {
        return NextResponse.json({ 
          error: "Reset hour must be an integer between 0 and 23",
          code: "INVALID_RESET_HOUR" 
        }, { status: 400 });
      }
    }

    // Basic timezone validation if provided
    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || timezone.length === 0 || timezone.length > 50) {
        return NextResponse.json({ 
          error: "Timezone must be a valid string",
          code: "INVALID_TIMEZONE" 
        }, { status: 400 });
      }
    }

    // Check if settings exist (userId null for single-user app)
    const existingSettings = await db.select()
      .from(settings)
      .where(isNull(settings.userId))
      .limit(1);

    const currentTimestamp = Date.now();

    if (existingSettings.length > 0) {
      // Update existing settings
      const updateData: any = {
        updatedAt: currentTimestamp
      };

      if (resetHour !== undefined) {
        updateData.resetHour = resetHour;
      }

      if (timezone !== undefined) {
        updateData.timezone = timezone;
      }

      const updated = await db.update(settings)
        .set(updateData)
        .where(isNull(settings.userId))
        .returning();

      return NextResponse.json(updated[0]);
    } else {
      // Create new settings with provided values or defaults
      const newSettings = {
        userId: null,
        resetHour: resetHour !== undefined ? resetHour : 9,
        timezone: timezone !== undefined ? timezone : 'UTC',
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp
      };

      const created = await db.insert(settings)
        .values(newSettings)
        .returning();

      return NextResponse.json(created[0]);
    }
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}