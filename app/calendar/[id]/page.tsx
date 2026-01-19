"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { TourProvider, useTour } from "@reactour/tour";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { AvailabilityMetrics } from "@/components/availability-metrics";
import { Calendar } from "@/components/calendar";
import { FloatingControls } from "@/components/floating-controls";
import { LoadingScreen } from "@/components/loading-screen";
import { PinEntryDialog } from "@/components/pin-entry-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { Button as ShadcnButton } from "@/components/ui/button";
import { type CalendarEvent, useCalendarStore } from "@/lib/calendar-store";
import { createClient } from "@/lib/supabase/client";
import { steps } from "@/lib/tour-steps";
import { cn, parseError } from "@/lib/utils";

export default function CalendarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsOpen } = useTour();
  const calendarId = params.id as string;
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>("connecting");
  const [loadingError, setLoadingError] = useState<string>("");
  const [isTourComplete, setIsTourComplete] = useState<boolean>(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const {
    setCalendarId,
    setCalendarName,
    setEvents,
    addEvent,
    removeEvent,
    events,
  } = useCalendarStore();

  const handlePinSubmit = async (enteredPin: string) => {
    try {
      setIsLoading(true);
      setShowPinDialog(false);
      setLoadingStep("verifying");
      setLoadingError(""); // Clear any previous errors

      const response = await fetch("/api/calendar/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: calendarId, pin: enteredPin }),
      });

      if (!response.ok) {
        throw new Error((await response.json()).error);
      }

      setLoadingStep("loading");
      const data = await response.json();

      // Only store the PIN
      localStorage.setItem(`calendar-${calendarId}`, enteredPin);
      setPin(enteredPin);

      setCalendarId(data.id);
      setCalendarName(data.name);

      // Convert dates and set events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedEvents: CalendarEvent[] = data.events.map((e: any) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
      }));
      setEvents(formattedEvents);

      // Set up realtime will happen in the useEffect
      setLoadingStep("syncing");

      // Small delay to show the syncing step
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error("Failed to join calendar:", errorMessage);
      setLoadingError(`Failed to join calendar: ${errorMessage}`);
      // Don't auto-hide, let user click retry
    }
  };

  const handlePinCancel = () => {
    router.push("/");
  };

  const handlePinRotated = (newPin: string) => {
    setPin(newPin);
    localStorage.setItem(`calendar-${calendarId}`, newPin);
  };

  const handleRetry = () => {
    // Clear error and stored PIN, then show PIN dialog
    setLoadingError("");
    setIsLoading(false);
    localStorage.removeItem(`calendar-${calendarId}`);
    setShowPinDialog(true);
  };

  // Initialize calendar and set up real-time subscription
  useEffect(() => {
    if (!calendarId) return;

    // If a PIN exists in search params, store it
    if (pin) localStorage.setItem(`calendar-${calendarId}`, pin);

    const initCalendar = async () => {
      try {
        // Check for stored PIN
        const storedPin = localStorage.getItem(`calendar-${calendarId}`) || pin;

        if (!storedPin) {
          // No stored PIN, show PIN dialog immediately without loading screen
          setShowPinDialog(true);
          setIsLoading(false);
          return;
        }

        // Try to load calendar with stored PIN
        router.replace(`/calendar/${calendarId}`);
        setLoadingStep("connecting");
        setLoadingStep("verifying");

        const response = await fetch("/api/calendar/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: calendarId, pin: storedPin }),
        });

        if (!response.ok) {
          // Invalid stored PIN
          localStorage.removeItem(`calendar-${calendarId}`);
          setLoadingError("Session expired. Please enter the PIN again.");
          // Don't auto-hide, let user click retry
          return;
        }

        setLoadingStep("loading");
        const data = await response.json();
        setPin(storedPin);
        setCalendarId(data.id);
        setCalendarName(data.name);

        // Convert dates and set events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedEvents: CalendarEvent[] = data.events.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }));
        setEvents(formattedEvents);

        setLoadingStep("syncing");

        // Small delay to show the syncing complete
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } catch (error) {
        const errorMessage = parseError(error);
        console.error("Failed to load calendar:", errorMessage);
        setLoadingError(`Failed to load calendar: ${errorMessage}`);
        // Don't auto-hide, let user click retry
      }
    };

    initCalendar();

    // Check if tour is complete
    const tourComplete = localStorage.getItem("tour-completed") === "true";
    setIsTourComplete(tourComplete);
    if (!tourComplete) {
      setIsOpen(true);
      localStorage.setItem("tour-completed", "false");
    }
  }, [calendarId, setCalendarId, setCalendarName, setEvents]);

  // Set up Supabase realtime subscription after successful auth
  useEffect(() => {
    if (!(calendarId && pin)) return;

    const supabase = createClient();
    const channel = supabase.channel(`calendar-${calendarId}`);

    channel
      .on("broadcast", { event: "event-created" }, ({ payload }) => {
        const newEvent: CalendarEvent = {
          ...payload,
          start: new Date(payload.start),
          end: new Date(payload.end),
        };
        addEvent(newEvent);
      })
      .on("broadcast", { event: "event-deleted" }, ({ payload }) => {
        removeEvent(payload.eventId);
      })
      .on("broadcast", { event: "events-modified" }, ({ payload }) => {
        // Handle event modifications
        if (payload.events) {
          const formattedEvents: CalendarEvent[] = payload.events.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e: any) => ({
              ...e,
              start: new Date(e.start),
              end: new Date(e.end),
            })
          );
          setEvents(formattedEvents);
        }
      })
      .on("broadcast", { event: "calendar-updated" }, ({ payload }) => {
        setCalendarName(payload.name);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarId, pin, setCalendarName, setEvents, addEvent, removeEvent]);

  const handleCreateEvent = async (title: string, start: Date, end: Date) => {
    try {
      const response = await fetch(`/api/calendar/${calendarId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pin}`,
        },
        body: JSON.stringify({ title, start, end }),
      });

      if (!response.ok) {
        const errorMessage = (await response.json()).error;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const event = await response.json();
      const formattedEvent: CalendarEvent = {
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      };

      // Broadcast to other users
      const supabase = createClient();
      await supabase.channel(`calendar-${calendarId}`).send({
        type: "broadcast",
        event: "event-created",
        payload: formattedEvent,
      });

      // Add to local state
      addEvent(formattedEvent);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error("Failed to create event:", errorMessage);
      throw new Error(`Failed to create event: ${errorMessage}`);
    }
  };

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      try {
        const response = await fetch(`/api/calendar/${calendarId}/events`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pin}`,
          },
          body: JSON.stringify({ eventId }),
        });

        if (!response.ok) {
          throw new Error((await response.json()).error);
        }

        // Broadcast to other users
        const supabase = createClient();
        await supabase.channel(`calendar-${calendarId}`).send({
          type: "broadcast",
          event: "event-deleted",
          payload: { eventId },
        });

        // Remove from local state
        removeEvent(eventId);
      } catch (error) {
        const errorMessage = parseError(error);
        throw new Error(errorMessage);
      }
    },
    [calendarId, pin, removeEvent]
  );

  const handleNameChange = async (name: string) => {
    try {
      const response = await fetch(`/api/calendar/${calendarId}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pin}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorMessage = (await response.json()).error;
        console.error(`Failed to update calendar name: ${errorMessage}`);
        throw new Error(`Failed to update calendar name: ${errorMessage}`);
      }

      // Broadcast to other users
      const supabase = createClient();
      await supabase.channel(`calendar-${calendarId}`).send({
        type: "broadcast",
        event: "calendar-updated",
        payload: { name },
      });

      // Update local state
      setCalendarName(name);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error("Error updating calendar name:", errorMessage);
      throw new Error(`Failed to update calendar name: ${errorMessage}`);
    }
  };

  if (showPinDialog) {
    return (
      <PinEntryDialog
        onCancel={handlePinCancel}
        onSubmit={handlePinSubmit}
        open={showPinDialog}
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingScreen
        currentStep={loadingStep}
        error={loadingError}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <TourProvider
      afterOpen={() => {
        if (!isMobile && bodyRef.current)
          disableBodyScroll(bodyRef.current as Element);
      }}
      beforeClose={() => {
        if (!isMobile && bodyRef.current)
          enableBodyScroll(bodyRef.current as Element);
        localStorage.setItem("tour-completed", "true");
      }}
      defaultOpen={!isTourComplete}
      disableInteraction
      nextButton={({ Button, currentStep, stepsLength, setIsOpen }) =>
        currentStep === stepsLength - 1 ? (
          <ShadcnButton
            onClick={() => setIsOpen(false)}
            size="sm"
            variant="outline"
          >
            Close
          </ShadcnButton>
        ) : (
          <Button hideArrow kind="next">
            <CaretRightIcon
              className={cn(
                "size-5 rounded",
                currentStep === stepsLength - 1 && "hidden"
              )}
            />
          </Button>
        )
      }
      onClickHighlighted={(e) => e.stopPropagation()}
      prevButton={({ Button, currentStep }) => (
        <Button hideArrow kind="prev">
          <CaretLeftIcon
            className={cn("size-5 rounded", currentStep === 0 && "hidden")}
          />
        </Button>
      )}
      scrollSmooth
      steps={steps}
      styles={{
        popover: (base) => ({
          ...base,
          "--reactour-accent": "var(--muted-foreground)",
          backgroundColor: "var(--popover)",
          border: "solid 2px var(--border)",
          borderRadius: 8,
          color: "var(--foreground)",
        }),
        maskArea: (base) => ({ ...base, rx: 14 }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({ ...base, color: "var(--foreground)" }),
      }}
    >
      <div
        className="flex h-screen animate-fade-in flex-col gap-3 p-4 sm:gap-4"
        ref={bodyRef}
      >
        <FloatingControls
          onNameChange={handleNameChange}
          onShareClick={() => setShowShareDialog(true)}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4 lg:flex-row">
          {/* Metrics panel - always visible */}
          <div className="order-2 shrink-0 lg:order-1 lg:w-80 xl:w-96">
            <div className="h-full overflow-y-auto">
              <AvailabilityMetrics events={events} />
            </div>
          </div>

          {/* Calendar - takes remaining space */}
          <div className="order-1 flex min-h-0 flex-1 flex-col lg:order-2">
            <Calendar
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </div>
        </div>

        <ShareDialog
          calendarId={calendarId}
          onOpenChange={setShowShareDialog}
          onPinRotated={handlePinRotated}
          open={showShareDialog}
          pin={pin}
        />
      </div>
    </TourProvider>
  );
}
