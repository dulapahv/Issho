"use client";

import { SignInIcon } from "@phosphor-icons/react";
import * as Form from "@radix-ui/react-form";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { Spinner } from "@/components/spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { parseError } from "@/lib/utils";

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
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const pin = formData.get("pin") as string;

    setIsLoading(true);
    setServerError("");

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
    setServerError("");
    onCancel();
  };

  // Shared form content component
  const FormContent = () => (
    <Form.Root
      onClearServerErrors={() => setServerError("")}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 pb-4">
        <Form.Field className="grid gap-2" name="pin">
          <div className="flex items-baseline justify-between">
            <Form.Label className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              PIN (6 digits)
            </Form.Label>
            <Form.Message
              className="text-[13px] text-destructive"
              match="valueMissing"
            >
              Please enter a PIN
            </Form.Message>
            <Form.Message
              className="text-[13px] text-destructive"
              match="patternMismatch"
            >
              PIN must be 6 digits
            </Form.Message>
            <Form.Message
              className="text-[13px] text-destructive"
              match={(value) => !!value && value.length !== 6}
            >
              PIN must be exactly 6 digits
            </Form.Message>
          </div>
          <Form.Control asChild>
            <Input
              autoFocus
              className="font-mono tracking-[0.5em] data-invalid:border-destructive"
              disabled={isLoading}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => {
                // Only allow digits
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 6) {
                  e.target.value = value;
                  // Clear server error when user starts typing
                  if (serverError) {
                    setServerError("");
                  }
                }
              }}
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              type="text"
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
            disabled={isLoading}
            onClick={handleCancel}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Form.Submit asChild>
            <Button disabled={isLoading}>
              {isLoading ? (
                <Spinner size="sm" variant="secondary" />
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
            <Button className="w-full" disabled={isLoading} size="lg">
              {isLoading ? (
                <Spinner size="sm" variant="secondary" />
              ) : (
                <SignInIcon className="size-5" />
              )}
              Join Calendar
            </Button>
          </Form.Submit>
          <DrawerClose asChild>
            <Button
              className="w-full"
              disabled={isLoading}
              onClick={handleCancel}
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

  // Mobile: Use Drawer with dismissible=false to prevent swipe/outside click dismissal
  if (isMobile) {
    return (
      <Drawer
        dismissible={false}
        onOpenChange={(newOpen) => {
          // Only allow closing via the Cancel button
          if (!(newOpen || isLoading)) {
            handleCancel();
          }
        }}
        open={open}
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
