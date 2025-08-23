'use client';

import { useState } from 'react';

import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CopyIcon,
  LinkIcon,
} from '@phosphor-icons/react';
import { isMobile } from 'react-device-detect';
import { toast } from 'sonner';

import { parseError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/spinner';

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
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      toast.success('PIN updated successfully');
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
            id="share-url"
            value={calendarUrl}
            readOnly
            className="font-mono text-sm"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleCopy(calendarUrl, 'url')}
          >
            {copiedField === 'url' ? (
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
            id="share-id"
            value={calendarId}
            readOnly
            className="font-mono tracking-widest"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleCopy(calendarId, 'id')}
          >
            {copiedField === 'id' ? (
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
            variant="ghost"
            size="sm"
            onClick={handleRotatePin}
            disabled={isRotatingPin}
            className="h-7 text-xs"
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
            id="share-pin"
            value={pin}
            readOnly
            className="font-mono tracking-[0.5em]"
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleCopy(pin, 'pin')}
          >
            {copiedField === 'pin' ? (
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
      <Drawer open={open} onOpenChange={onOpenChange}>
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
              onClick={() => handleCopy(shareMessage, 'all')}
              className="w-full"
              variant="default"
              size="lg"
            >
              {copiedField === 'all' ? (
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
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => onOpenChange(false)}
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 sm:max-w-[500px]">
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
            onClick={() => handleCopy(shareMessage, 'all')}
            className="w-full"
            variant="default"
          >
            {copiedField === 'all' ? (
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
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
