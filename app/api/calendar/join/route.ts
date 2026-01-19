import { type NextRequest, NextResponse } from "next/server";

// import { checkBotId } from 'botid/server';

import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  PATTERNS,
  SUCCESS_MESSAGES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { parseError, verifyPIN } from "@/lib/utils";

export async function POST(request: NextRequest) {
  // const verification = await checkBotId();

  // if (verification.isBot) {
  //   return NextResponse.json(
  //     { error: ERROR_MESSAGES.BOT.VERIFICATION_FAILED },
  //     { status: HTTP_STATUS.FORBIDDEN },
  //   );
  // }

  try {
    const { id, pin } = await request.json();

    if (!(id && pin)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.ID_AND_PIN_REQUIRED },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate PIN format
    if (!PATTERNS.PIN.test(pin)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.PIN.INVALID_FORMAT },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const normalizedId = id.toUpperCase();

    // Validate calendar ID format
    if (!PATTERNS.CALENDAR_ID.test(normalizedId)) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.VALIDATION.INVALID_REQUEST_DATA },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const calendar = await prisma.calendar.findUnique({
      where: { id: normalizedId },
      include: { events: true },
    });

    if (!calendar) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const isValidPin = await verifyPIN(pin, calendar.pinHash);

    if (!isValidPin) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.AUTH.INVALID_PIN },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    return NextResponse.json(
      {
        id: calendar.id,
        name: calendar.name,
        events: calendar.events,
        message: SUCCESS_MESSAGES.CALENDAR.JOINED,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    const errorMessage = parseError(error);
    console.error("Error joining calendar:", errorMessage);
    return NextResponse.json(
      { error: `${ERROR_MESSAGES.CALENDAR.JOIN_FAILED}: ${errorMessage}` },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
