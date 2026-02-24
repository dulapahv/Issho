"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { addDays } from "date-fns/addDays";
import { addMonths } from "date-fns/addMonths";
import { addWeeks } from "date-fns/addWeeks";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { enUS } from "date-fns/locale/en-US";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { subDays } from "date-fns/subDays";
import { subMonths } from "date-fns/subMonths";
import { subWeeks } from "date-fns/subWeeks";
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
import { useSettingsStore } from "@/lib/settings-store";
import { cn, parseError } from "@/lib/utils";

import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": enUS,
};

interface CalendarProps {
  onCreateEvent: (title: string, start: Date, end: Date) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export function Calendar({ onCreateEvent, onDeleteEvent }: CalendarProps) {
  const { events, isDrawMode } = useCalendarStore();
  const { timeFormat, weekStartsOn } = useSettingsStore();
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("calendar-view");
      const validViews: string[] = [
        Views.MONTH,
        Views.WEEK,
        Views.DAY,
        Views.AGENDA,
      ];
      if (saved && validViews.includes(saved)) {
        return saved as View;
      }
    }
    return Views.MONTH;
  });
  const deletingEventIds = useRef(new Set<string>());

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn }),
        getDay,
        locales,
      }),
    [weekStartsOn]
  );

  const calendarFormats = useMemo(
    () => ({
      timeGutterFormat: timeFormat === "24h" ? "HH:mm" : "h:mm a",
      eventTimeRangeFormat: (
        { start, end }: { start: Date; end: Date },
        culture?: string,
        localizer?: {
          format: (date: Date, fmt: string, culture?: string) => string;
        }
      ) => {
        const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm a";
        const s = localizer?.format(start, fmt, culture) ?? "";
        const e = localizer?.format(end, fmt, culture) ?? "";
        return `${s} - ${e}`;
      },
      selectRangeFormat: (
        { start, end }: { start: Date; end: Date },
        culture?: string,
        localizer?: {
          format: (date: Date, fmt: string, culture?: string) => string;
        }
      ) => {
        const fmt = timeFormat === "24h" ? "HH:mm" : "h:mm a";
        const s = localizer?.format(start, fmt, culture) ?? "";
        const e = localizer?.format(end, fmt, culture) ?? "";
        return `${s} - ${e}`;
      },
      agendaHeaderFormat: (
        { start, end }: { start: Date; end: Date },
        culture?: string,
        localizer?: {
          format: (date: Date, fmt: string, culture?: string) => string;
        }
      ) => {
        const s = localizer?.format(start, "MMM d, yyyy", culture) ?? "";
        const e = localizer?.format(end, "MMM d, yyyy", culture) ?? "";
        return `${s} – ${e}`;
      },
    }),
    [timeFormat]
  );

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
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
      if (!isDrawMode && !deletingEventIds.current.has(event.id)) {
        // Delete mode - delete specific event when clicked
        deletingEventIds.current.add(event.id);
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
          deletingEventIds.current.delete(event.id);
        }
      }
    },
    [isDrawMode, onDeleteEvent]
  );

  const handleNameSubmit = async (userName: string) => {
    if (!selectedSlot) {
      throw new Error("No slot selected");
    }
    await onCreateEvent(userName, selectedSlot.start, selectedSlot.end);
    // Clear selection on success
    setSelectedSlot(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setShowNameDialog(open);
    if (!open) {
      setSelectedSlot(null);
    }
  };

  /** Returns the date offset by one step in the given direction for the current view. */
  const getNavigatedDate = useCallback(
    (direction: 1 | -1): Date => {
      const navigators: Record<string, (date: Date, amount: number) => Date> = {
        [Views.MONTH]: direction === 1 ? addMonths : subMonths,
        [Views.WEEK]: direction === 1 ? addWeeks : subWeeks,
        [Views.DAY]: direction === 1 ? addDays : subDays,
        [Views.AGENDA]: direction === 1 ? addMonths : subMonths,
      };
      const navigate = navigators[currentView];
      return navigate ? navigate(currentDate, 1) : currentDate;
    },
    [currentDate, currentView]
  );

  /** Handles calendar navigation (prev, next, today). */
  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      if (action === "TODAY") {
        setCurrentDate(new Date());
        return;
      }
      setCurrentDate(getNavigatedDate(action === "NEXT" ? 1 : -1));
    },
    [getNavigatedDate]
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

  /** Switches to the specified calendar view and persists to localStorage. */
  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view);
    localStorage.setItem("calendar-view", view);
  }, []);

  // Calendar components customization
  const components = useMemo(
    () => ({
      // biome-ignore lint/suspicious/noExplicitAny: react-big-calendar toolbar props type is complex
      toolbar: (props: any) => (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
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
          <ToggleGroup
            onValueChange={(value) => {
              if (value) {
                handleViewChange(value as View);
              }
            }}
            type="single"
            value={currentView}
            variant="outline"
          >
            <ToggleGroupItem value={Views.MONTH}>Month</ToggleGroupItem>
            <ToggleGroupItem value={Views.WEEK}>Week</ToggleGroupItem>
            <ToggleGroupItem value={Views.DAY}>Day</ToggleGroupItem>
            <ToggleGroupItem value={Views.AGENDA}>Agenda</ToggleGroupItem>
          </ToggleGroup>
        </div>
      ),
    }),
    [handleNavigate, handleViewChange, currentView]
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
            formats={calendarFormats}
            localizer={localizer}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onView={handleViewChange}
            popup
            scrollToTime={scrollToTime}
            selectable={isDrawMode}
            startAccessor="start"
            step={15}
            timeslots={4}
            titleAccessor="title"
            view={currentView}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
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
