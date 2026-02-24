"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
// biome-ignore lint/performance/noNamespaceImport: Radix UI Form uses namespace pattern
import * as Form from "@radix-ui/react-form";
import { useRef, useState } from "react";
import type { SlotInfo } from "react-big-calendar";
import { isMobile } from "react-device-detect";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/lib/settings-store";
import { parseError } from "@/lib/utils";

interface MarkAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSlot: SlotInfo | null;
  onSubmit: (userName: string) => Promise<void>;
}

export function MarkAvailabilityDialog({
  open,
  onOpenChange,
  selectedSlot,
  onSubmit,
}: MarkAvailabilityDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [serverError, setServerError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const { timeFormat } = useSettingsStore();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlot || isCreating) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const userName = (formData.get("userName") as string).trim();

    setIsCreating(true);
    setServerError("");

    try {
      await onSubmit(userName);
      // Only close dialog on success
      onOpenChange(false);
    } catch (error) {
      // Keep dialog open on error
      const errorMessage = parseError(error);
      console.error(`Failed to mark availability: ${errorMessage}`);
      setServerError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!(open || isCreating)) {
      onOpenChange(false);
      setServerError("");
    }
  };

  // Custom validation function for name
  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return true; // Return true to show error
    }
    if (trimmed.length < 1) {
      return true;
    }
    return false; // Return false when valid
  };

  /**
   * Determines whether the selected slot spans specific times
   * (from week/day view) vs full days (from month view).
   */
  const isTimeSlot = () => {
    if (!selectedSlot) {
      return false;
    }
    const { start, end } = selectedSlot;
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    // If the slot is less than 24 hours, it's a time-specific slot
    // Also check if start has non-midnight time
    const hasStartTime = start.getHours() !== 0 || start.getMinutes() !== 0;
    return diffHours < 24 || hasStartTime;
  };

  /** Formats the selected slot for display, handling both date-only and time-specific selections. */
  const formatDateRange = () => {
    if (!selectedSlot) {
      return "";
    }

    const { start, end } = selectedSlot;

    // Time-specific slot (from week/day view)
    if (isTimeSlot()) {
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: timeFormat === "24h" ? "2-digit" : "numeric",
        minute: "2-digit",
        hour12: timeFormat === "12h",
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: start.getFullYear() !== end.getFullYear() ? "numeric" : undefined,
      };

      const startDateStr = start.toLocaleDateString(undefined, dateOptions);
      const startTimeStr = start.toLocaleTimeString(undefined, timeOptions);
      const endTimeStr = end.toLocaleTimeString(undefined, timeOptions);

      if (start.toDateString() === end.toDateString()) {
        return `${startDateStr}, ${startTimeStr} - ${endTimeStr}`;
      }

      const endDateStr = end.toLocaleDateString(undefined, dateOptions);
      return `${startDateStr} ${startTimeStr} - ${endDateStr} ${endTimeStr}`;
    }

    // Full-day slot (from month view) - original behavior
    const adjustedEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year:
        start.getFullYear() !== adjustedEnd.getFullYear()
          ? "numeric"
          : undefined,
    };

    const startStr = start.toLocaleDateString(undefined, options);
    const endStr = adjustedEnd.toLocaleDateString(undefined, options);

    // Calculate number of days (inclusive)
    const diffTime = adjustedEnd.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const dayText = diffDays === 1 ? "day" : "days";

    if (start.toDateString() === adjustedEnd.toDateString()) {
      return `${startStr} (1 day)`;
    }

    return `${startStr} - ${endStr} (${diffDays} ${dayText})`;
  };

  // Shared form content
  const FormContent = () => (
    <Form.Root
      className="space-y-4"
      onClearServerErrors={() => setServerError("")}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {/* Show selected date range */}
      <div className="rounded-lg bg-muted p-3 text-sm">
        <span className="text-muted-foreground">
          {isTimeSlot() ? "Selected time: " : "Selected dates: "}
        </span>
        <span className="font-medium">{formatDateRange()}</span>
      </div>

      <Form.Field className="space-y-2" name="userName">
        <div className="flex items-baseline justify-between">
          <Form.Label className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Your Name
          </Form.Label>
          <Form.Message
            className="text-[13px] text-destructive"
            match="valueMissing"
          >
            Please enter your name
          </Form.Message>
          <Form.Message
            className="text-[13px] text-destructive"
            match={validateName}
          >
            Name cannot be empty
          </Form.Message>
        </div>
        <Form.Control asChild>
          <Input
            autoComplete="off"
            autoFocus
            className="data-invalid:border-destructive"
            disabled={isCreating}
            placeholder="Enter your name"
            required
            type="text"
          />
        </Form.Control>
      </Form.Field>

      {/* Server error message */}
      {serverError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
          <WarningCircleIcon className="size-5 text-destructive" />
          <span className="text-destructive text-sm">{serverError}</span>
        </div>
      )}

      {/* Desktop Footer */}
      {!isMobile && (
        <DialogFooter>
          <Button
            disabled={isCreating}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button disabled={isCreating}>
              {isCreating ? (
                <Spinner size="sm" variant="secondary" />
              ) : (
                <CheckIcon className="size-5" />
              )}
              Mark Available
            </Button>
          </Form.Submit>
        </DialogFooter>
      )}

      {/* Mobile Footer */}
      {isMobile && (
        <DrawerFooter className="px-0 pt-2">
          <Form.Submit asChild>
            <Button className="w-full" disabled={isCreating} size="lg">
              {isCreating ? (
                <Spinner size="sm" variant="secondary" />
              ) : (
                <CheckIcon className="size-5" />
              )}
              Mark Available
            </Button>
          </Form.Submit>
          <DrawerClose asChild>
            <Button
              className="w-full"
              disabled={isCreating}
              onClick={() => handleOpenChange(false)}
              size="lg"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      )}
    </Form.Root>
  );

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer onOpenChange={handleOpenChange} open={open}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Mark Availability</DrawerTitle>
            <DrawerDescription>
              Enter your name to mark these dates as available.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop/Tablet: Use Dialog
  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="gap-6">
        <DialogHeader>
          <DialogTitle>Mark Availability</DialogTitle>
          <DialogDescription>
            Enter your name to mark these dates as available.
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}
