'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { format } from 'date-fns/format';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  SlotInfo,
  View,
  Views,
} from 'react-big-calendar';
import { toast } from 'sonner';

import { CalendarEvent, useCalendarStore } from '@/lib/calendar-store';
import { cn, parseError } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MarkAvailabilityDialog } from '@/components/mark-availability-dialog';

import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const startOfWeekMonday = (date: Date) => {
  return startOfWeek(date, { weekStartsOn: 1 }); // 1 = Monday
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: startOfWeekMonday,
  getDay,
  locales,
});

interface CalendarProps {
  onCreateEvent: (title: string, start: Date, end: Date) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export function Calendar({ onCreateEvent, onDeleteEvent }: CalendarProps) {
  const { events, isDrawMode } = useCalendarStore();
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const isProcessingRef = useRef(false);

  const handleSelectSlot = useCallback(
    async (slotInfo: SlotInfo) => {
      if (isProcessingRef.current) return;

      if (isDrawMode) {
        // Mark Available mode only
        setSelectedSlot(slotInfo);
        setShowNameDialog(true);
      }
      // In delete mode, do nothing on slot selection - only allow clicking specific events
    },
    [isDrawMode],
  );

  const handleSelectEvent = useCallback(
    async (event: CalendarEvent) => {
      if (!isDrawMode && !isProcessingRef.current) {
        // Delete mode - delete specific event when clicked
        isProcessingRef.current = true;
        const toastId = toast.loading('Removing availability...');

        try {
          await onDeleteEvent(event.id);
          toast.success('Availability removed', { id: toastId });
        } catch (error) {
          const errorMessage = parseError(error);
          console.error('Failed to remove availability:', errorMessage);
          toast.error(`Failed to remove availability: ${errorMessage}`, {
            id: toastId,
          });
        } finally {
          isProcessingRef.current = false;
        }
      }
    },
    [isDrawMode, onDeleteEvent],
  );

  const handleNameSubmit = async (userName: string) => {
    if (!selectedSlot) {
      throw new Error('No slot selected');
    }

    try {
      await onCreateEvent(userName, selectedSlot.start, selectedSlot.end);
      // Clear selection on success
      setSelectedSlot(null);
    } catch (error) {
      // Re-throw to let the dialog handle the error
      throw error;
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setShowNameDialog(open);
    if (!open) {
      setSelectedSlot(null);
    }
  };

  // Navigation handlers
  const handleNavigate = useCallback(
    (action: 'PREV' | 'NEXT' | 'TODAY') => {
      if (action === 'TODAY') {
        setCurrentDate(new Date());
      } else if (action === 'NEXT') {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
      } else if (action === 'PREV') {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
      }
    },
    [currentDate],
  );

  // Style events based on their color
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: '4px',
          opacity: 0.9,
          color: 'white',
          border: '0px',
          display: 'block',
          cursor: !isDrawMode ? 'pointer' : 'default',
        },
      };
    },
    [isDrawMode],
  );

  // Memoized configuration
  const { scrollToTime } = useMemo(
    () => ({
      scrollToTime: new Date(1970, 1, 1, 6),
    }),
    [],
  );

  // Calendar components customization
  const components = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolbar: (props: any) => (
        <div className="mb-4 flex items-center gap-x-6">
          <ToggleGroup type="single" variant="outline">
            <ToggleGroupItem
              value="back"
              className="gap-1"
              onClick={() => handleNavigate('PREV')}
            >
              <CaretLeftIcon className="size-4" />
              Back
            </ToggleGroupItem>
            <ToggleGroupItem
              value="today"
              onClick={() => handleNavigate('TODAY')}
            >
              Today
            </ToggleGroupItem>
            <ToggleGroupItem
              value="next"
              className="gap-1"
              onClick={() => handleNavigate('NEXT')}
            >
              Next
              <CaretRightIcon className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="rbc-toolbar-label">{props.label}</span>
        </div>
      ),
    }),
    [handleNavigate],
  );

  return (
    <>
      <Card className="flex-1 overflow-hidden" id="tour-step-2">
        <CardContent className="h-full">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            date={currentDate}
            onNavigate={setCurrentDate}
            view={currentView}
            onView={setCurrentView}
            views={[Views.MONTH]}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable={isDrawMode}
            scrollToTime={scrollToTime}
            dayLayoutAlgorithm="no-overlap"
            eventPropGetter={eventStyleGetter}
            components={components}
            popup
            className={cn(
              'h-full min-h-160',
              isDrawMode
                ? '[&>div]:last:cursor-crosshair'
                : '[&>div]:last:cursor-not-allowed',
            )}
          />
        </CardContent>
      </Card>

      <MarkAvailabilityDialog
        open={showNameDialog}
        onOpenChange={handleDialogOpenChange}
        selectedSlot={selectedSlot}
        onSubmit={handleNameSubmit}
      />
    </>
  );
}
