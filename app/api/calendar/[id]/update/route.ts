import { type NextRequest, NextResponse } from "next/server";

// import { checkBotId } from 'botid/server';

import { ERROR_MESSAGES, HTTP_STATUS, VALIDATION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { parseError, verifyPIN } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/calendar/[id]/update">
) {
  // const verification = await checkBotId();

  // if (verification.isBot) {
  //   return NextResponse.json(
  //     { error: ERROR_MESSAGES.BOT.VERIFICATION_FAILED },
  //     { status: HTTP_STATUS.FORBIDDEN },
  //   );
  // }

  try {
    const { id } = await params;
    const normalizedId = id.toUpperCase();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.AUTH.MISSING_TOKEN },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const pin = authHeader.substring(7);

    const calendar = await prisma.calendar.findUnique({
      where: { id: normalizedId },
    });

    if (!calendar) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const isValid = await verifyPIN(pin, calendar.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.AUTH.INVALID_PIN },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.NAME_REQUIRED },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const trimmedName = name.trim();

    if (trimmedName.length < VALIDATION.CALENDAR_NAME.MIN_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.NAME_TOO_SHORT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (trimmedName.length > VALIDATION.CALENDAR_NAME.MAX_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.NAME_TOO_LONG },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const updatedCalendar = await prisma.calendar.update({
      where: {
        id: normalizedId,
      },
      data: {
        name: trimmedName,
      },
    });

    return NextResponse.json(updatedCalendar, { status: HTTP_STATUS.OK });
  } catch (error) {
    const errorMessage = parseError(error);
    console.error("Error updating calendar:", errorMessage);
    return NextResponse.json(
      { error: `${ERROR_MESSAGES.CALENDAR.UPDATE_FAILED}: ${errorMessage}` },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
