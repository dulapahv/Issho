'use client';

import { useState } from 'react';

import { SignInIcon } from '@phosphor-icons/react';
import * as Form from '@radix-ui/react-form';
import { isMobile } from 'react-device-detect';

import { parseError } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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

interface PinEntryDialogProps {
  open: boolean;
  onSubmit: (pin: string) => Promise<void>;
  onCancel: () => void;
}

export function PinEntryDialog({
  open,
  onSubmit,
  onCancel,
}: PinEntryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const pin = formData.get('pin') as string;

    setIsLoading(true);
    setServerError('');

    try {
      await onSubmit(pin);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to submit PIN: ${errorMessage}`);
      setServerError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset errors when canceling
    setServerError('');
    onCancel();
  };

  // Shared form content component
  const FormContent = () => (
    <Form.Root
      onSubmit={handleSubmit}
      onClearServerErrors={() => setServerError('')}
    >
      <div className="grid gap-4 pb-4">
        <Form.Field name="pin" className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <Form.Label
              className="text-sm leading-none font-medium
                peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              PIN (6 digits)
            </Form.Label>
            <Form.Message
              className="text-destructive text-[13px]"
              match="valueMissing"
            >
              Please enter a PIN
            </Form.Message>
            <Form.Message
              className="text-destructive text-[13px]"
              match="patternMismatch"
            >
              PIN must be 6 digits
            </Form.Message>
            <Form.Message
              className="text-destructive text-[13px]"
              match={(value) => !!value && value.length !== 6}
            >
              PIN must be exactly 6 digits
            </Form.Message>
          </div>
          <Form.Control asChild>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              required
              disabled={isLoading}
              autoFocus
              className="data-invalid:border-destructive font-mono
                tracking-[0.5em]"
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 6) {
                  e.target.value = value;
                  // Clear server error when user starts typing
                  if (serverError) {
                    setServerError('');
                  }
                }
              }}
            />
          </Form.Control>
        </Form.Field>

        {/* Server error message */}
        {serverError && (
          <p className="text-destructive text-sm">{serverError}</p>
        )}
      </div>

      {/* Desktop Footer */}
      {!isMobile && (
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button disabled={isLoading}>
              {isLoading ? (
                <Spinner variant="secondary" size="sm" />
              ) : (
                <SignInIcon className="size-5" />
              )}
              Join Calendar
            </Button>
          </Form.Submit>
        </AlertDialogFooter>
      )}

      {/* Mobile Footer */}
      {isMobile && (
        <DrawerFooter className="px-0">
          <Form.Submit asChild>
            <Button disabled={isLoading} size="lg" className="w-full">
              {isLoading ? (
                <Spinner variant="secondary" size="sm" />
              ) : (
                <SignInIcon className="size-5" />
              )}
              Join Calendar
            </Button>
          </Form.Submit>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
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

  // Mobile: Use Drawer with dismissible=false to prevent swipe/outside click dismissal
  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(newOpen) => {
          // Only allow closing via the Cancel button
          if (!newOpen && !isLoading) {
            handleCancel();
          }
        }}
        dismissible={false}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Enter Calendar PIN</DrawerTitle>
            <DrawerDescription>
              Please enter the 6-digit PIN to access this calendar.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop/Tablet: Use AlertDialog
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-106.25">
        <AlertDialogHeader>
          <AlertDialogTitle>Enter Calendar PIN</AlertDialogTitle>
          <AlertDialogDescription>
            Please enter the 6-digit PIN to access this calendar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormContent />
      </AlertDialogContent>
    </AlertDialog>
  );
}
