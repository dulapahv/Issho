"use client";

import {
  CheckIcon,
  PencilSimpleIcon,
  ShareIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { HelpPopup } from "@/components/help-popup";
import { Spinner } from "@/components/spinner";
import { ThemePopup } from "@/components/theme-popup";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalendarStore } from "@/lib/calendar-store";
import { parseError } from "@/lib/utils";

interface FloatingControlsProps {
  onShareClick: () => void;
  onNameChange: (name: string) => Promise<void>;
}

export function FloatingControls({
  onShareClick,
  onNameChange,
}: FloatingControlsProps) {
  const { calendarName, isDrawMode, setDrawMode } = useCalendarStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(calendarName);
  const [isSavingName, setIsSavingName] = useState(false);

  const handleNameSubmit = async () => {
    if (tempName.trim() && tempName !== calendarName && !isSavingName) {
      setIsSavingName(true);
      try {
        await onNameChange(tempName.trim());
        setIsEditingName(false);
      } catch (error) {
        const errorMessage = parseError(error);
        console.error(`Failed to change calendar name: ${errorMessage}`);
        setTempName(calendarName);
      } finally {
        setIsSavingName(false);
      }
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameCancel = () => {
    if (!isSavingName) {
      setTempName(calendarName);
      setIsEditingName(false);
    }
  };

  const handleNameClick = () => {
    setTempName(calendarName);
    setIsEditingName(true);
  };

  return (
    <TooltipProvider>
      {/* Desktop/Tablet Header Bar */}
      <Card className="py-2">
        <CardContent className="flex flex-col flex-wrap gap-2 px-4 lg:flex-row lg:items-center">
          {/* Calendar Name */}
          <div className="min-w-0 flex-1">
            {/* Mobile: Always show button, editing handled by drawer */}
            {isMobile ? (
              <Button onClick={handleNameClick} variant="ghost">
                <span className="truncate font-medium text-base md:text-lg">
                  {calendarName}
                </span>
                <PencilSimpleIcon className="size-5 shrink-0 text-muted-foreground" />
              </Button>
            ) : /* Desktop/Tablet: Inline editing */
            isEditingName ? (
              <div className="flex max-w-sm items-center gap-x-2">
                <Input
                  autoFocus
                  className="h-8 data-invalid:border-destructive"
                  disabled={isSavingName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSavingName) handleNameSubmit();
                    if (e.key === "Escape" && !isSavingName) handleNameCancel();
                  }}
                  value={tempName}
                />
                <div className="flex">
                  <Button
                    className="size-8 p-0"
                    disabled={isSavingName}
                    onClick={handleNameSubmit}
                    size="sm"
                    variant="ghost"
                  >
                    {isSavingName ? (
                      <Spinner size="sm" />
                    ) : (
                      <CheckIcon className="size-5" />
                    )}
                  </Button>
                  <Button
                    className="size-8 p-0"
                    disabled={isSavingName}
                    onClick={handleNameCancel}
                    size="sm"
                    variant="ghost"
                  >
                    <XIcon className="size-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleNameClick} variant="ghost">
                <span className="max-w-44 truncate font-medium text-base sm:max-w-64 md:text-lg xl:max-w-96">
                  {calendarName}
                </span>
                <PencilSimpleIcon className="size-5 shrink-0 text-muted-foreground" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Mode Toggle - Responsive */}
            <div className="flex flex-wrap items-center gap-2" id="tour-step-1">
              {/* Helper text - hidden on smaller tablets */}
              <span className="order-2 inline text-muted-foreground text-xs sm:order-1">
                {isDrawMode
                  ? `${isMobile ? "Tap, hold," : "Click"} and drag to mark available`
                  : `${isMobile ? "Tap" : "Click"} on events to delete`}
              </span>

              {/* Desktop view (md+): Full toggle */}
              <ToggleGroup
                className="order-1 flex sm:order-2"
                onValueChange={(value) => {
                  if (value) setDrawMode(value === "draw");
                }}
                type="single"
                value={isDrawMode ? "draw" : "delete"}
                variant="outline"
              >
                <ToggleGroupItem
                  aria-label="Mark available"
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white"
                  value="draw"
                >
                  <CheckIcon className="size-5" />
                  Mark Available
                </ToggleGroupItem>
                <ToggleGroupItem
                  aria-label="Delete available"
                  className="data-[state=on]:bg-red-500 data-[state=on]:text-white"
                  value="delete"
                >
                  <XIcon className="size-5" />
                  Delete Available
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Actions - Responsive */}
            <div className="flex gap-1 md:gap-2">
              {/* Tablet: Icon only, Desktop: With text */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="w-auto px-3"
                    id="tour-step-4"
                    onClick={onShareClick}
                    size="icon"
                    variant="outline"
                  >
                    <ShareIcon className="size-5" />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="md:hidden">
                  Share Calendar
                </TooltipContent>
              </Tooltip>

              <ThemePopup />
              <HelpPopup />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Name Edit Drawer - Only renders on mobile devices */}
      {isMobile && (
        <Drawer onOpenChange={setIsEditingName} open={isEditingName}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Edit Calendar Name</DrawerTitle>
              <DrawerDescription>
                Give your calendar a memorable name that everyone can recognize.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <Input
                autoFocus
                className="data-invalid:border-destructive"
                disabled={isSavingName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSavingName) handleNameSubmit();
                }}
                placeholder="Calendar name"
                value={tempName}
              />
            </div>
            <DrawerFooter>
              <Button
                disabled={
                  isSavingName || !tempName.trim() || tempName === calendarName
                }
                onClick={handleNameSubmit}
              >
                {isSavingName ? (
                  <Spinner size="sm" />
                ) : (
                  <PencilSimpleIcon className="size-5" />
                )}
                Save Name
              </Button>
              <DrawerClose asChild>
                <Button
                  disabled={isSavingName}
                  onClick={handleNameCancel}
                  variant="outline"
                >
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </TooltipProvider>
  );
}
