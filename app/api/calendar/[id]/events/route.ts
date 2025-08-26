import { NextRequest, NextResponse } from 'next/server';

import { checkBotId } from 'botid/server';

import { ERROR_MESSAGES, HTTP_STATUS, VALIDATION } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { generateColorFromName, parseError, verifyPIN } from '@/lib/utils';

// Helper function to verify calendar access
async function verifyCalendarAccess(calendarId: string, request: NextRequest) {
  const normalizedCalendarId = calendarId.toUpperCase();

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: ERROR_MESSAGES.AUTH.MISSING_TOKEN,
      status: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  const pin = authHeader.substring(7);

  const calendar = await prisma.calendar.findUnique({
    where: { id: normalizedCalendarId },
  });

  if (!calendar) {
    return {
      authorized: false,
      error: ERROR_MESSAGES.CALENDAR.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
    };
  }

  const isValid = await verifyPIN(pin, calendar.pinHash);
  if (!isValid) {
    return {
      authorized: false,
      error: ERROR_MESSAGES.AUTH.INVALID_PIN,
      status: HTTP_STATUS.UNAUTHORIZED,
    };
  }

  return { authorized: true, calendar };
}

// Create event
export async function POST(
  request: NextRequest,
  { params }: RouteContext<'/api/calendar/[id]/events'>,
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

    const access = await verifyCalendarAccess(normalizedId, request);
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const { title, start, end } = await request.json();

    if (!title || !start || !end) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.EVENT.REQUIRED_FIELDS },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length < VALIDATION.EVENT_TITLE.MIN_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.EVENT.TITLE_TOO_SHORT },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    if (trimmedTitle.length > VALIDATION.EVENT_TITLE.MAX_LENGTH) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.EVENT.TITLE_TOO_LONG },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Validate date range
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.EVENT.INVALID_DATE_RANGE },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const color = generateColorFromName(trimmedTitle);

    const event = await prisma.event.create({
      data: {
        calendarId: normalizedId,
        title: trimmedTitle,
        start: startDate,
        end: endDate,
        color,
      },
    });

    return NextResponse.json(event, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    const errorMessage = parseError(error);
    console.error('Error creating event:', errorMessage);
    return NextResponse.json(
      { error: `${ERROR_MESSAGES.EVENT.CREATE_FAILED}: ${errorMessage}` },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// Delete single event or smart delete
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext<'/api/calendar/[id]/events'>,
) {
  // TODO: Somehow isBot always return true for DELETE requests
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

    const access = await verifyCalendarAccess(normalizedId, request);
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const body = await request.json();

    // Single event deletion
    await prisma.event.delete({
      where: {
        id: body.eventId,
        calendarId: normalizedId,
      },
    });

    return NextResponse.json(
      { success: true, deleted: 1 },
      { status: HTTP_STATUS.OK },
    );

    // if (body.eventId) {
    //   await prisma.event.delete({
    //     where: {
    //       id: body.eventId,
    //       calendarId: normalizedId,
    //     },
    //   });

    //   return NextResponse.json(
    //     { success: true, deleted: 1 },
    //     { status: HTTP_STATUS.OK },
    //   );
    // }

    // // Smart delete
    // const { deleteStart, deleteEnd, smartDelete = false } = body;

    // if (smartDelete && deleteStart && deleteEnd) {
    //   const events = await prisma.event.findMany({
    //     where: {
    //       calendarId: normalizedId,
    //       OR: [
    //         {
    //           AND: [
    //             { start: { lt: new Date(deleteEnd) } },
    //             { end: { gt: new Date(deleteStart) } },
    //           ],
    //         },
    //       ],
    //     },
    //   });

    //   const operations = [];

    //   for (const event of events) {
    //     const eventStart = new Date(event.start);
    //     const eventEnd = new Date(event.end);
    //     const delStart = new Date(deleteStart);
    //     const delEnd = new Date(deleteEnd);

    //     // Case 1: Event completely within delete range
    //     if (eventStart >= delStart && eventEnd <= delEnd) {
    //       operations.push(prisma.event.delete({ where: { id: event.id } }));
    //     }
    //     // Case 2: Delete range completely within event - split
    //     else if (eventStart < delStart && eventEnd > delEnd) {
    //       operations.push(prisma.event.delete({ where: { id: event.id } }));
    //       operations.push(
    //         prisma.event.create({
    //           data: {
    //             calendarId: normalizedId,
    //             title: event.title,
    //             start: eventStart,
    //             end: delStart,
    //             color: event.color,
    //           },
    //         }),
    //       );
    //       operations.push(
    //         prisma.event.create({
    //           data: {
    //             calendarId: normalizedId,
    //             title: event.title,
    //             start: delEnd,
    //             end: eventEnd,
    //             color: event.color,
    //           },
    //         }),
    //       );
    //     }
    //     // Case 3: Delete range overlaps start
    //     else if (
    //       delStart <= eventStart &&
    //       delEnd > eventStart &&
    //       delEnd < eventEnd
    //     ) {
    //       operations.push(
    //         prisma.event.update({
    //           where: { id: event.id },
    //           data: { start: delEnd },
    //         }),
    //       );
    //     }
    //     // Case 4: Delete range overlaps end
    //     else if (
    //       delStart > eventStart &&
    //       delStart < eventEnd &&
    //       delEnd >= eventEnd
    //     ) {
    //       operations.push(
    //         prisma.event.update({
    //           where: { id: event.id },
    //           data: { end: delStart },
    //         }),
    //       );
    //     }
    //   }

    //   await prisma.$transaction(operations);
    //   return NextResponse.json(
    //     { success: true, modified: operations.length },
    //     { status: HTTP_STATUS.OK },
    //   );
    // } else {
    //   // Simple delete by IDs
    //   const { eventIds } = body;

    //   if (!eventIds || !Array.isArray(eventIds)) {
    //     return NextResponse.json(
    //       { error: ERROR_MESSAGES.EVENT.IDS_ARRAY_REQUIRED },
    //       { status: HTTP_STATUS.BAD_REQUEST },
    //     );
    //   }

    //   await prisma.event.deleteMany({
    //     where: {
    //       id: { in: eventIds },
    //       calendarId: normalizedId,
    //     },
    //   });

    //   return NextResponse.json({ success: true }, { status: HTTP_STATUS.OK });
    // }
  } catch (error) {
    const errorMessage = parseError(error);
    console.error('Failed to delete event:', errorMessage);
    return NextResponse.json(
      { error: `${ERROR_MESSAGES.EVENT.DELETE_FAILED}: ${errorMessage}` },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// Get events
export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/api/calendar/[id]/events'>,
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

    const access = await verifyCalendarAccess(normalizedId, request);
    if (!access.authorized) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const events = await prisma.event.findMany({
      where: {
        calendarId: normalizedId,
      },
      orderBy: {
        start: 'asc',
      },
    });

    return NextResponse.json(events, { status: HTTP_STATUS.OK });
  } catch (error) {
    const errorMessage = parseError(error);
    console.error('Error fetching events:', errorMessage);
    return NextResponse.json(
      { error: `${ERROR_MESSAGES.EVENT.FETCH_FAILED}: ${errorMessage}` },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}
