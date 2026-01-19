"use client";

import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { parseError } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarId: string;
  pin: string;
  onPinRotated: (newPin: string) => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  calendarId,
  pin,
  onPinRotated,
}: ShareDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRotatingPin, setIsRotatingPin] = useState(false);

  const calendarUrl = `${window.location.origin}/calendar/${calendarId}?pin=${pin}`;

  const shareMessage = `📅 Join my calendar on Issho!

🔗 Invite URL: ${calendarUrl}

🪪 Calendar ID: ${calendarId}
🔑 PIN: ${pin}

Click the Invite URL or enter Calendar ID and PIN to join!`;

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 800);
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to copy to clipboard: ${errorMessage}`);
      toast.error(`Failed to copy to clipboard: ${errorMessage}`);
    }
  };

  const handleRotatePin = async () => {
    setIsRotatingPin(true);
    try {
      const response = await fetch(`/api/calendar/${calendarId}/rotate-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pin}`,
        },
      });

      if (!response.ok) {
        const errorMessage = (await response.json()).error;
        console.error(`Failed to update PIN: ${errorMessage}`);
        toast.error(`Failed to update PIN: ${errorMessage}`);
        return;
      }

      const data = await response.json();
      onPinRotated(data.pin);
      toast.success("PIN updated successfully");
    } catch (error) {
      const errorMessage = parseError(error);
      console.error(`Failed to update PIN: ${errorMessage}`);
      toast.error(`Failed to update PIN: ${errorMessage}`);
    } finally {
      setIsRotatingPin(false);
    }
  };

  // Shared content component
  const ShareContent = () => (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="share-url">Invite URL</Label>
        <div className="flex gap-2">
          <Input
            className="font-mono text-sm"
            id="share-url"
            readOnly
            value={calendarUrl}
          />
          <Button
            onClick={() => handleCopy(calendarUrl, "url")}
            size="icon"
            variant="outline"
          >
            {copiedField === "url" ? (
              <CheckIcon className="size-5" />
            ) : (
              <CopyIcon className="size-5" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-2">
        <Label htmlFor="share-id">Calendar ID</Label>
        <div className="flex gap-2">
          <Input
            className="font-mono tracking-widest"
            id="share-id"
            readOnly
            value={calendarId}
          />
          <Button
            onClick={() => handleCopy(calendarId, "id")}
            size="icon"
            variant="outline"
          >
            {copiedField === "id" ? (
              <CheckIcon className="size-5" />
            ) : (
              <CopyIcon className="size-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="share-pin">PIN</Label>
          <Button
            className="h-7 text-xs"
            disabled={isRotatingPin}
            onClick={handleRotatePin}
            size="sm"
            variant="ghost"
          >
            {isRotatingPin ? (
              <Spinner size="sm" />
            ) : (
              <ArrowsClockwiseIcon className="size-5" />
            )}
            Generate New PIN
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            className="font-mono tracking-[0.5em]"
            id="share-pin"
            readOnly
            value={pin}
          />
          <Button
            onClick={() => handleCopy(pin, "pin")}
            size="icon"
            variant="outline"
          >
            {copiedField === "pin" ? (
              <CheckIcon className="size-5" />
            ) : (
              <CopyIcon className="size-5" />
            )}
          </Button>
        </div>
      </div>

      <Separator />
    </div>
  );

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Share Calendar</DrawerTitle>
            <DrawerDescription>
              Share these credentials with your friends to let them join this
              calendar.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <ShareContent />
          </div>
          <DrawerFooter>
            <Button
              className="w-full"
              onClick={() => handleCopy(shareMessage, "all")}
              size="lg"
              variant="default"
            >
              {copiedField === "all" ? (
                <>
                  <CheckIcon className="size-5" />
                  Message Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="size-5" />
                  Copy Share Message
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                className="w-full"
                onClick={() => onOpenChange(false)}
                size="lg"
                variant="outline"
              >
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop/Tablet: Use Dialog
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-6 sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Share Calendar</DialogTitle>
          <DialogDescription>
            Share these credentials with your friends to let them join this
            calendar.
          </DialogDescription>
        </DialogHeader>
        <ShareContent />
        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => handleCopy(shareMessage, "all")}
            variant="default"
          >
            {copiedField === "all" ? (
              <>
                <CheckIcon className="size-5" />
                Message Copied!
              </>
            ) : (
              <>
                <LinkIcon className="size-5" />
                Copy Share Message
              </>
            )}
          </Button>
          <DialogClose asChild>
            <Button
              className="w-full"
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
