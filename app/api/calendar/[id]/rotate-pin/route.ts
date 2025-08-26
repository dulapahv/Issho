import { NextRequest, NextResponse } from 'next/server';

import { checkBotId } from 'botid/server';

import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { generatePIN, hashPINForDB, parseError, verifyPIN } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: RouteContext<'/api/calendar/[id]/rotate-pin'>,
) {
  const verification = await checkBotId();

  if (verification.isBot) {
    return NextResponse.json(
      { error: ERROR_MESSAGES.BOT.VERIFICATION_FAILED },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  try {
    const { id } = await params;
    const normalizedId = id.toUpperCase();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.AUTH.MISSING_TOKEN },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const currentPin = authHeader.substring(7);

    const calendar = await prisma.calendar.findUnique({
      where: { id: normalizedId },
    });

    if (!calendar) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.CALENDAR.NOT_FOUND },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    const isValid = await verifyPIN(currentPin, calendar.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.AUTH.INVALID_PIN },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const newPin = generatePIN();
    const newPinHash = await hashPINForDB(newPin);

    await prisma.calendar.update({
      where: { id: normalizedId },
      data: { pinHash: newPinHash },
    });

    return NextResponse.json(
      {
        success: true,
        message: SUCCESS_MESSAGES.PIN.ROTATED,
        pin: newPin,
      },
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    const errorMessage = parseError(error);
    console.error('Error rotating PIN:', errorMessage);
    return NextResponse.json(
      { error: `${ERROR_MESSAGES.PIN.ROTATE_FAILED}: ${errorMessage}` },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
