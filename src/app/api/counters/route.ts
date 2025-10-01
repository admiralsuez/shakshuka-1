import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { monthlyStats, tasks, strikes, settings } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Since auth is not set up, use default timezone/resetHour
    // In future, this would come from user settings after auth is implemented
    const timezone = 'UTC';
    const resetHour = 9;

    // Calculate current month based on timezone and reset hour
    const now = new Date();
    const userTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    const currentYear = parseInt(userTime.find(part => part.type === 'year')?.value || '');
    const currentMonth = parseInt(userTime.find(part => part.type === 'month')?.value || '');
    const currentDay = parseInt(userTime.find(part => part.type === 'day')?.value || '');
    const currentHour = parseInt(userTime.find(part => part.type === 'hour')?.value || '');

    // Adjust month if current hour is before reset hour
    let effectiveMonth = currentMonth;
    let effectiveYear = currentYear;
    
    if (currentHour < resetHour && currentDay === 1) {
      effectiveMonth = effectiveMonth === 1 ? 12 : effectiveMonth - 1;
      if (effectiveMonth === 12) {
        effectiveYear = effectiveYear - 1;
      }
    }

    const monthString = `${effectiveYear}-${effectiveMonth.toString().padStart(2, '0')}`;

    // Get or create monthly stats record for current month
    let monthlyStatsRecord = await db.select()
      .from(monthlyStats)
      .where(eq(monthlyStats.month, monthString))
      .limit(1);

    if (monthlyStatsRecord.length === 0) {
      const timestamp = Math.floor(Date.now() / 1000);
      monthlyStatsRecord = await db.insert(monthlyStats)
        .values({
          month: monthString,
          strikesCount: 0,
          expiredCount: 0,
          completedCount: 0,
          tasksAddedCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .returning();
    }

    const stats = monthlyStatsRecord[0];

    // Calculate real-time expired count for today
    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    // Get tasks with dueHour that have passed today without strikes
    const expiredTasks = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          sql`${tasks.dueHour} IS NOT NULL`,
          sql`${tasks.dueHour} <= ${currentHour}`,
          eq(tasks.isCompleted, 0),
          sql`${tasks.id} NOT IN (
            SELECT task_id FROM ${strikes} 
            WHERE date = ${todayDate}
          )`
        )
      );

    const realTimeExpiredCount = expiredTasks[0]?.count || 0;

    return NextResponse.json({
      month: monthString,
      strikes: stats.strikesCount,
      expired: realTimeExpiredCount,
      completed: stats.completedCount
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}