"use client";

import {
  CheckIcon,
  GearSixIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettingsStore } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

/** Renders the shared settings form content used by both Dialog and Drawer. */
function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const { timeFormat, weekStartsOn, setTimeFormat, setWeekStartsOn } =
    useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="space-y-3">
        <Label className="font-semibold text-sm">Appearance</Label>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((option) => (
            <Button
              className={cn(
                "justify-start gap-2",
                theme === option.value && "bg-accent!"
              )}
              key={option.value}
              onClick={() => setTheme(option.value)}
              variant="outline"
            >
              <option.icon className="size-4" />
              <span className="text-sm">{option.label}</span>
              {theme === option.value && (
                <CheckIcon className="ml-auto size-4" />
              )}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Time Format */}
      <div className="space-y-3">
        <Label className="font-semibold text-sm">Time Format</Label>
        <ToggleGroup
          className="justify-start"
          onValueChange={(value) => {
            if (value) {
              setTimeFormat(value as "12h" | "24h");
            }
          }}
          type="single"
          value={timeFormat}
          variant="outline"
        >
          <ToggleGroupItem value="12h">12-hour</ToggleGroupItem>
          <ToggleGroupItem value="24h">24-hour</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      {/* Week Starts On */}
      <div className="space-y-3">
        <Label className="font-semibold text-sm">Week Starts On</Label>
        <ToggleGroup
          className="justify-start"
          onValueChange={(value) => {
            if (value) {
              setWeekStartsOn(Number(value) as 0 | 1);
            }
          }}
          type="single"
          value={String(weekStartsOn)}
          variant="outline"
        >
          <ToggleGroupItem value="0">Sunday</ToggleGroupItem>
          <ToggleGroupItem value="1">Monday</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

export function SettingsDialog() {
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <Button onClick={() => setOpen(true)} size="icon" variant="outline">
          <GearSixIcon className="size-5" />
          <span className="sr-only">Settings</span>
        </Button>
        <Drawer onOpenChange={setOpen} open={open}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Settings</DrawerTitle>
              <DrawerDescription>
                Customize your calendar preferences.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <SettingsContent />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="icon" variant="outline">
        <GearSixIcon className="size-5" />
        <span className="sr-only">Settings</span>
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your calendar preferences.
            </DialogDescription>
          </DialogHeader>
          <SettingsContent />
        </DialogContent>
      </Dialog>
    </>
  );
}
