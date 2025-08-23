'use client';

import { useRef, useState } from 'react';

import { CheckIcon } from '@phosphor-icons/react';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr';
import * as Form from '@radix-ui/react-form';
import { SlotInfo } from 'react-big-calendar';
import { isMobile } from 'react-device-detect';

import { parseError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/spinner';

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
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlot || isCreating) return;

    const formData = new FormData(event.currentTarget);
    const userName = (formData.get('userName') as string).trim();

    setIsCreating(true);
    setServerError('');

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
    if (!open && !isCreating) {
      onOpenChange(false);
      setServerError('');
    }
  };

  // Custom validation function for name
  const validateName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true; // Return true to show error
    if (trimmed.length < 1) return true;
    return false; // Return false when valid
  };

  // Format the selected dates for display
  const formatDateRange = () => {
    if (!selectedSlot) return '';

    const start = selectedSlot.start;
    const end = new Date(selectedSlot.end.getTime() - 24 * 60 * 60 * 1000);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
    };

    const startStr = start.toLocaleDateString(undefined, options);
    const endStr = end.toLocaleDateString(undefined, options);

    // Calculate number of days (inclusive)
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const dayText = diffDays === 1 ? 'day' : 'days';

    // If same day, just show one date
    if (start.toDateString() === end.toDateString()) {
      return `${startStr} (1 day)`;
    }

    return `${startStr} - ${endStr} (${diffDays} ${dayText})`;
  };

  // Shared form content
  const FormContent = () => (
    <Form.Root
      ref={formRef}
      onSubmit={handleSubmit}
      onClearServerErrors={() => setServerError('')}
      className="space-y-4"
    >
      {/* Show selected date range */}
      <div className="bg-muted rounded-lg p-3 text-sm">
        <span className="text-muted-foreground">Selected dates: </span>
        <span className="font-medium">{formatDateRange()}</span>
      </div>

      <Form.Field name="userName" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Form.Label
            className="text-sm leading-none font-medium
              peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Your Name
          </Form.Label>
          <Form.Message
            className="text-destructive text-[13px]"
            match="valueMissing"
          >
            Please enter your name
          </Form.Message>
          <Form.Message
            className="text-destructive text-[13px]"
            match={validateName}
          >
            Name cannot be empty
          </Form.Message>
        </div>
        <Form.Control asChild>
          <Input
            type="text"
            placeholder="Enter your name"
            required
            disabled={isCreating}
            autoFocus
            autoComplete="off"
            className="data-[invalid]:border-destructive"
          />
        </Form.Control>
      </Form.Field>

      {/* Server error message */}
      {serverError && (
        <div
          className="bg-destructive/10 flex items-center gap-2 rounded-md px-3
            py-2"
        >
          <WarningCircleIcon className="text-destructive size-5" />
          <span className="text-destructive text-sm">{serverError}</span>
        </div>
      )}

      {/* Desktop Footer */}
      {!isMobile && (
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button disabled={isCreating}>
              {isCreating ? (
                <Spinner variant="secondary" size="sm" />
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
            <Button disabled={isCreating} size="lg" className="w-full">
              {isCreating ? (
                <Spinner variant="secondary" size="sm" />
              ) : (
                <CheckIcon className="size-5" />
              )}
              Mark Available
            </Button>
          </Form.Submit>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
              size="lg"
              className="w-full"
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
      <Drawer open={open} onOpenChange={handleOpenChange}>
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
