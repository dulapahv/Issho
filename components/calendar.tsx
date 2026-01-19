"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
  Views,
} from "react-big-calendar";
import { toast } from "sonner";
import { MarkAvailabilityDialog } from "@/components/mark-availability-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type CalendarEvent, useCalendarStore } from "@/lib/calendar-store";
import { cn, parseError } from "@/lib/utils";

import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
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
    [isDrawMode]
  );

  const handleSelectEvent = useCallback(
    async (event: CalendarEvent) => {
      if (!(isDrawMode || isProcessingRef.current)) {
        // Delete mode - delete specific event when clicked
        isProcessingRef.current = true;
        const toastId = toast.loading("Removing availability...");

        try {
          await onDeleteEvent(event.id);
          toast.success("Availability removed", { id: toastId });
        } catch (error) {
          const errorMessage = parseError(error);
          console.error("Failed to remove availability:", errorMessage);
          toast.error(`Failed to remove availability: ${errorMessage}`, {
            id: toastId,
          });
        } finally {
          isProcessingRef.current = false;
        }
      }
    },
    [isDrawMode, onDeleteEvent]
  );

  const handleNameSubmit = async (userName: string) => {
    if (!selectedSlot) {
      throw new Error("No slot selected");
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
    (action: "PREV" | "NEXT" | "TODAY") => {
      if (action === "TODAY") {
        setCurrentDate(new Date());
      } else if (action === "NEXT") {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
      } else if (action === "PREV") {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
      }
    },
    [currentDate]
  );

  // Style events based on their color
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      return {
        style: {
          backgroundColor: event.color,
          borderRadius: "4px",
          opacity: 0.9,
          color: "white",
          border: "0px",
          display: "block",
          cursor: isDrawMode ? "default" : "pointer",
        },
      };
    },
    [isDrawMode]
  );

  // Memoized configuration
  const { scrollToTime } = useMemo(
    () => ({
      scrollToTime: new Date(1970, 1, 1, 6),
    }),
    []
  );

  // Calendar components customization
  const components = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toolbar: (props: any) => (
        <div className="mb-4 flex items-center gap-x-6">
          <ToggleGroup type="single" variant="outline">
            <ToggleGroupItem
              className="gap-1"
              onClick={() => handleNavigate("PREV")}
              value="back"
            >
              <CaretLeftIcon className="size-4" />
              Back
            </ToggleGroupItem>
            <ToggleGroupItem
              onClick={() => handleNavigate("TODAY")}
              value="today"
            >
              Today
            </ToggleGroupItem>
            <ToggleGroupItem
              className="gap-1"
              onClick={() => handleNavigate("NEXT")}
              value="next"
            >
              Next
              <CaretRightIcon className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="rbc-toolbar-label">{props.label}</span>
        </div>
      ),
    }),
    [handleNavigate]
  );

  return (
    <>
      <Card className="flex-1 overflow-hidden" id="tour-step-2">
        <CardContent className="h-full">
          <BigCalendar
            className={cn(
              "h-full min-h-160",
              isDrawMode
                ? "[&>div]:last:cursor-crosshair"
                : "[&>div]:last:cursor-not-allowed"
            )}
            components={components}
            date={currentDate}
            dayLayoutAlgorithm="no-overlap"
            endAccessor="end"
            eventPropGetter={eventStyleGetter}
            events={events}
            localizer={localizer}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onView={setCurrentView}
            popup
            scrollToTime={scrollToTime}
            selectable={isDrawMode}
            startAccessor="start"
            titleAccessor="title"
            view={currentView}
            views={[Views.MONTH]}
          />
        </CardContent>
      </Card>

      <MarkAvailabilityDialog
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleNameSubmit}
        open={showNameDialog}
        selectedSlot={selectedSlot}
      />
    </>
  );
}
