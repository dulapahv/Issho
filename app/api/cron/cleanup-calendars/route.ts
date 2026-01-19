import { NextRequest, NextResponse } from 'next/server';

// import { checkBotId } from 'botid/server';

import {
  CLEANUP,
  ERROR_MESSAGES,
  HTTP_STATUS,
  IS_DEV_ENV,
  SUCCESS_MESSAGES,
} from '@/lib/constants';
import { prisma } from '@/lib/prisma';

/**
 * Vercel Cron Job to clean up old calendars
 * Runs daily at midnight UTC (00:00)
 * Deletes calendars that haven't been updated in CLEANUP.DAYS_UNTIL_DELETION days
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request from Vercel
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the request is from Vercel
    if (!IS_DEV_ENV) {
      // Check if request is from Vercel Cron
      const userAgent = request.headers.get('user-agent');
      if (!userAgent?.includes('vercel-cron/1.0')) {
        // If not from Vercel Cron, check BotID to prevent abuse
        // const verification = await checkBotId({
        //   developmentOptions: IS_DEV_ENV ? { bypass: 'HUMAN' } : undefined,
        // });
        // if (verification.isBot) {
        //   return NextResponse.json(
        //     { error: ERROR_MESSAGES.AUTH.UNAUTHORIZED },
        //     { status: HTTP_STATUS.UNAUTHORIZED },
        //   );
        // }
      }

      // Additional security: Use a secret token in production
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.error('Invalid cron secret');
        return NextResponse.json(
          { error: ERROR_MESSAGES.AUTH.UNAUTHORIZED },
          { status: HTTP_STATUS.UNAUTHORIZED },
        );
      }
    }

    // Calculate the cutoff date (CLEANUP.DAYS_UNTIL_DELETION days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP.DAYS_UNTIL_DELETION);

    console.log(
      `[Cron] Starting calendar cleanup job at ${new Date().toISOString()}`,
    );
    console.log(
      `[Cron] Deleting calendars not updated since ${cutoffDate.toISOString()}`,
    );

    // First, get the count of calendars to delete
    const countToDelete = await prisma.calendar.count({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    if (countToDelete === 0) {
      console.log('[Cron] No calendars to delete');
      return NextResponse.json({
        success: true,
        message: SUCCESS_MESSAGES.CLEANUP.NO_CALENDARS,
        deletedCount: 0,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[Cron] Found ${countToDelete} calendars to delete`);

    // Get IDs of calendars to delete (for logging purposes)
    const calendarsToDelete = await prisma.calendar.findMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
      take: CLEANUP.BATCH_SIZE,
    });

    // Log calendars being deleted (useful for debugging)
    if (IS_DEV_ENV) {
      calendarsToDelete.forEach((cal) => {
        console.log(
          `[Cron] Deleting calendar: ${cal.id} - "${cal.name}" (${cal._count.events} events, last updated: ${cal.updatedAt.toISOString()})`,
        );
      });
    }

    // Delete calendars in batches
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore && totalDeleted < countToDelete) {
      // Delete a batch of calendars
      // Using deleteMany with a where clause to delete in batches
      const deleteResult = await prisma.calendar.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate,
          },
        },
        // Prisma doesn't support 'take' in deleteMany, so we'll delete all at once
        // If you need batching, you'd need to fetch IDs first then delete specific IDs
      });

      totalDeleted = deleteResult.count;
      hasMore = false; // Since we're deleting all at once
    }

    // Get some statistics for logging
    const remainingCalendars = await prisma.calendar.count();

    const result = {
      success: true,
      message: `${SUCCESS_MESSAGES.CLEANUP.COMPLETED}: ${totalDeleted} calendars`,
      deletedCount: totalDeleted,
      remainingCalendars,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString(),
    };

    console.log(`[Cron] Cleanup completed:`, result);

    // Log to monitoring service if available
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job: 'cleanup-calendars',
            ...result,
          }),
        });
      } catch (error) {
        console.error('[Cron] Failed to send monitoring webhook:', error);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cron] Calendar cleanup job failed:', error);

    // Log error to monitoring service if available
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job: 'cleanup-calendars',
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.error('[Cron] Failed to send error webhook:', webhookError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.CLEANUP.JOB_FAILED,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
