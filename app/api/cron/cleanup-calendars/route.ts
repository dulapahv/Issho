import { type NextRequest, NextResponse } from "next/server";

import {
  CLEANUP,
  ERROR_MESSAGES,
  HTTP_STATUS,
  IS_DEV_ENV,
  SUCCESS_MESSAGES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Verify the request is from a legitimate source (Vercel Cron or authorized user)
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow all requests
  if (IS_DEV_ENV) {
    return true;
  }

  // Check if request is from Vercel Cron
  const userAgent = request.headers.get("user-agent");
  const isVercelCron = userAgent?.includes("vercel-cron/1.0");

  // If from Vercel Cron and no secret required, allow
  if (isVercelCron && !cronSecret) {
    return true;
  }

  // Verify secret token
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

/**
 * Send monitoring webhook notification
 */
async function sendMonitoringWebhook(
  data: Record<string, unknown>
): Promise<void> {
  const webhookUrl = process.env.MONITORING_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job: "cleanup-calendars",
        ...data,
      }),
    });
  } catch (error) {
    console.error("[Cron] Failed to send monitoring webhook:", error);
  }
}

/**
 * Log calendars being deleted (for debugging in development)
 */
function logCalendarsToDelete(
  calendars: Array<{
    id: string;
    name: string;
    updatedAt: Date;
    _count: { events: number };
  }>
): void {
  if (!IS_DEV_ENV) {
    return;
  }

  for (const cal of calendars) {
    console.log(
      `[Cron] Deleting calendar: ${cal.id} - "${cal.name}" (${cal._count.events} events, last updated: ${cal.updatedAt.toISOString()})`
    );
  }
}

/**
 * Vercel Cron Job to clean up old calendars
 * Runs daily at midnight UTC (00:00)
 * Deletes calendars that haven't been updated in CLEANUP.DAYS_UNTIL_DELETION days
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron job request
    if (!verifyAuthorization(request)) {
      console.error("Invalid cron secret");
      return NextResponse.json(
        { error: ERROR_MESSAGES.AUTH.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Calculate the cutoff date (CLEANUP.DAYS_UNTIL_DELETION days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP.DAYS_UNTIL_DELETION);

    console.log(
      `[Cron] Starting calendar cleanup job at ${new Date().toISOString()}`
    );
    console.log(
      `[Cron] Deleting calendars not updated since ${cutoffDate.toISOString()}`
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
      console.log("[Cron] No calendars to delete");
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

    logCalendarsToDelete(calendarsToDelete);

    // Delete all old calendars
    const deleteResult = await prisma.calendar.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    // Get some statistics for logging
    const remainingCalendars = await prisma.calendar.count();

    const result = {
      success: true,
      message: `${SUCCESS_MESSAGES.CLEANUP.COMPLETED}: ${deleteResult.count} calendars`,
      deletedCount: deleteResult.count,
      remainingCalendars,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: new Date().toISOString(),
    };

    console.log("[Cron] Cleanup completed:", result);

    await sendMonitoringWebhook(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Cron] Calendar cleanup job failed:", error);

    await sendMonitoringWebhook({
      error: true,
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: ERROR_MESSAGES.CLEANUP.JOB_FAILED,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
