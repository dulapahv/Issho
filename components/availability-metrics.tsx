"use client";

import {
  CalendarDotsIcon,
  CalendarHeartIcon,
  CalendarStarIcon,
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PulseIcon,
  SealCheckIcon,
  SunIcon,
  TrendDownIcon,
  TrendUpIcon,
  UserCheckIcon,
  UsersIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns/format";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { CalendarEvent } from "@/lib/calendar-store";
import { useSettingsStore } from "@/lib/settings-store";

const SLOT_MINUTES = 15;

interface AvailabilityMetricsProps {
  events: CalendarEvent[];
}

interface DateRange {
  start: Date;
  end: Date;
}

interface MeetingWindow {
  range: DateRange;
  participants: string[];
  count: number;
  durationMinutes: number;
}

interface ParticipantMetrics {
  name: string;
  totalMinutes: number;
  percentage: number;
  ranges: DateRange[];
}

interface PairwiseOverlap {
  pair: [string, string];
  overlapMinutes: number;
  percentage: number;
}

interface DayOfWeekMetric {
  day: string;
  slots: number;
  avgParticipants: number;
}

interface PeakHourMetric {
  hour: number;
  label: string;
  avgParticipants: number;
  totalSlots: number;
}

interface AvailabilityMetrics {
  totalParticipants: number;
  everyoneAvailable: boolean;
  hasTimeEvents: boolean;

  earliestDate: Date | null;
  latestDate: Date | null;
  earliestRange: DateRange | null;
  latestRange: DateRange | null;

  commonRanges: DateRange[];
  longest: DateRange | null;
  longestDurationMinutes: number;

  totalSlotsWithCoverage: number;
  totalCalendarSlots: number;
  coveragePercentage: number;
  averageParticipantsPerSlot: number;

  participantMetrics: ParticipantMetrics[];
  mostAvailable: ParticipantMetrics | null;
  leastAvailable: ParticipantMetrics | null;

  topMeetingWindows: MeetingWindow[];
  weekendSlots: number;
  weekdaySlots: number;
  optimalMeetingMinutes: number;

  pairwiseOverlaps: PairwiseOverlap[];
  heatmapData: Map<string, number>;

  bestDayOfWeek: DayOfWeekMetric | null;
  dayOfWeekBreakdown: DayOfWeekMetric[];
  peakHours: PeakHourMetric[];
}

/**
 * Generates 15-minute slot keys between start and end times.
 * Each key is formatted as "YYYY-MM-DDTHH:mm".
 */
function generateSlotKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const current = new Date(start);
  current.setSeconds(0, 0);
  // Round down to nearest 15-minute boundary
  current.setMinutes(
    Math.floor(current.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES
  );

  const endTime = end.getTime();
  while (current.getTime() < endTime) {
    keys.push(format(current, "yyyy-MM-dd'T'HH:mm"));
    current.setMinutes(current.getMinutes() + SLOT_MINUTES);
  }
  return keys;
}

/** Parses a slot key back to a Date object. */
function parseSlotKey(key: string): Date {
  const [datePart, timePart] = key.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Formats a duration in minutes as a human-readable string.
 * Returns "X days" for full-day multiples, "X hrs Y min" for sub-day durations.
 */
function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return "0 min";
  }
  const days = Math.floor(minutes / (24 * 60));
  const remainingHours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = minutes % 60;

  // Exact day multiples
  if (remainingHours === 0 && remainingMinutes === 0 && days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (remainingHours > 0) {
    parts.push(`${remainingHours} hr${remainingHours !== 1 ? "s" : ""}`);
  }
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} min`);
  }
  return parts.join(" ");
}

/**
 * Detects whether an event spans full days (all-day event) vs. having specific times.
 * An all-day event has start at midnight and end at midnight of a later day.
 */
function isAllDayEvent(event: CalendarEvent): boolean {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return (
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    start.getSeconds() === 0 &&
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    end.getTime() > start.getTime()
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex metrics component with interdependent computation and conditional rendering
export function AvailabilityMetrics({ events }: AvailabilityMetricsProps) {
  const { timeFormat } = useSettingsStore();
  const timeFmt = timeFormat === "24h" ? "HH:mm" : "h:mm a";
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex metrics calculation with many interdependent parts
  const metrics = useMemo((): AvailabilityMetrics | null => {
    if (events.length === 0) {
      return null;
    }

    const participants = new Set(events.map((e) => e.title));
    const totalParticipants = participants.size;

    // Detect if any events have specific times (non-all-day)
    const hasTimeEvents = events.some((e) => !isAllDayEvent(e));

    // Group events by participant
    const participantEvents = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!participantEvents.has(event.title)) {
        participantEvents.set(event.title, []);
      }
      participantEvents.get(event.title)?.push(event);
    }

    // Build slot availability map: slotKey -> Set<participant>
    const slotAvailability = new Map<string, Set<string>>();

    for (const event of events) {
      const start = new Date(event.start);
      const end = new Date(event.end);

      // For all-day events, generate slots covering the full day(s)
      const slotKeys = generateSlotKeys(start, end);
      for (const key of slotKeys) {
        if (!slotAvailability.has(key)) {
          slotAvailability.set(key, new Set());
        }
        slotAvailability.get(key)?.add(event.title);
      }
    }

    // Find max participant count across all slots
    let maxParticipantCount = 0;
    for (const participantSet of slotAvailability.values()) {
      if (participantSet.size > maxParticipantCount) {
        maxParticipantCount = participantSet.size;
      }
    }

    // Find all slot keys with maximum participation
    const allSlotKeys = Array.from(slotAvailability.keys()).sort();
    const maxParticipationKeys: string[] = [];

    for (const key of allSlotKeys) {
      const availableSet = slotAvailability.get(key);
      if (availableSet && availableSet.size === maxParticipantCount) {
        maxParticipationKeys.push(key);
      }
    }

    // Earliest/latest dates based on max participation
    const earliestDate =
      maxParticipationKeys.length > 0
        ? parseSlotKey(maxParticipationKeys[0])
        : null;
    const lastMaxKey = maxParticipationKeys.at(-1);
    const latestDate = lastMaxKey ? parseSlotKey(lastMaxKey) : null;

    // Convert consecutive max-participation slots to ranges
    const maxParticipationRanges = groupConsecutiveSlots(maxParticipationKeys);
    const earliestRange =
      maxParticipationRanges.length > 0 ? maxParticipationRanges[0] : null;
    const latestRange =
      maxParticipationRanges.length > 0
        ? (maxParticipationRanges.at(-1) ?? null)
        : null;

    // Find slots where everyone is available
    const everyoneAvailableKeys: string[] = [];
    for (const key of allSlotKeys) {
      const availableSet = slotAvailability.get(key);
      if (availableSet && availableSet.size === totalParticipants) {
        everyoneAvailableKeys.push(key);
      }
    }

    const commonRanges = groupConsecutiveSlots(everyoneAvailableKeys);

    // Find longest common range
    const longest =
      commonRanges.length > 0
        ? commonRanges.reduce((best, current) => {
            const currentDuration =
              current.end.getTime() - current.start.getTime();
            const bestDuration = best.end.getTime() - best.start.getTime();
            return currentDuration > bestDuration ? current : best;
          })
        : null;

    const longestDurationMinutes = longest
      ? Math.round(
          (longest.end.getTime() - longest.start.getTime()) / (1000 * 60)
        )
      : 0;

    // Overall coverage metrics
    let overallEarliestDate: Date | null = null;
    let overallLatestDate: Date | null = null;
    for (const event of events) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      if (!overallEarliestDate || start < overallEarliestDate) {
        overallEarliestDate = start;
      }
      if (!overallLatestDate || end > overallLatestDate) {
        overallLatestDate = end;
      }
    }

    const totalSlotsWithCoverage = slotAvailability.size;
    const totalCalendarSlots =
      overallEarliestDate && overallLatestDate
        ? Math.ceil(
            (overallLatestDate.getTime() - overallEarliestDate.getTime()) /
              (1000 * 60 * SLOT_MINUTES)
          )
        : 0;
    const coveragePercentage =
      totalCalendarSlots > 0
        ? (totalSlotsWithCoverage / totalCalendarSlots) * 100
        : 0;

    let totalParticipantSlots = 0;
    for (const participantSet of slotAvailability.values()) {
      totalParticipantSlots += participantSet.size;
    }
    const averageParticipantsPerSlot =
      totalSlotsWithCoverage > 0
        ? totalParticipantSlots / totalSlotsWithCoverage
        : 0;

    // Individual participant metrics
    const participantMetrics: ParticipantMetrics[] = [];
    for (const [name, pEvents] of participantEvents) {
      const participantSlots = new Set<string>();
      const ranges: DateRange[] = [];

      for (const event of pEvents) {
        ranges.push({ start: new Date(event.start), end: new Date(event.end) });
        const slotKeys = generateSlotKeys(
          new Date(event.start),
          new Date(event.end)
        );
        for (const key of slotKeys) {
          participantSlots.add(key);
        }
      }

      const totalMinutes = participantSlots.size * SLOT_MINUTES;
      const percentage =
        totalSlotsWithCoverage > 0
          ? (participantSlots.size / totalSlotsWithCoverage) * 100
          : 0;

      participantMetrics.push({ name, totalMinutes, percentage, ranges });
    }

    participantMetrics.sort((a, b) => b.totalMinutes - a.totalMinutes);
    const mostAvailable = participantMetrics[0] || null;
    const leastAvailable = participantMetrics.at(-1) || null;

    // Build meeting windows: group consecutive slots with same participant set
    const meetingWindows: MeetingWindow[] = [];

    interface WindowTracker {
      keys: string[];
      participants: Set<string>;
    }

    let currentWindow: WindowTracker | null = null;

    for (const key of allSlotKeys) {
      const availableSet = slotAvailability.get(key);
      if (!availableSet) {
        continue;
      }

      const isContinuation =
        currentWindow !== null &&
        currentWindow.participants.size === availableSet.size &&
        Array.from(currentWindow.participants).every((p) =>
          availableSet.has(p)
        ) &&
        isConsecutiveSlot(currentWindow.keys.at(-1) ?? "", key);

      if (isContinuation && currentWindow !== null) {
        currentWindow.keys.push(key);
      } else {
        if (currentWindow !== null && currentWindow.keys.length > 0) {
          pushMeetingWindow(meetingWindows, currentWindow);
        }
        currentWindow = { keys: [key], participants: new Set(availableSet) };
      }
    }

    if (currentWindow !== null && currentWindow.keys.length > 0) {
      pushMeetingWindow(meetingWindows, currentWindow);
    }

    // Sort by participant count, then by duration
    meetingWindows.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.durationMinutes - a.durationMinutes;
    });

    const topMeetingWindows = meetingWindows.slice(0, 5);

    // Weekend vs weekday slot counts
    let weekendSlots = 0;
    let weekdaySlots = 0;
    for (const key of allSlotKeys) {
      const day = parseSlotKey(key).getDay();
      if (day === 0 || day === 6) {
        weekendSlots++;
      } else {
        weekdaySlots++;
      }
    }

    // Optimal meeting length (most common window duration)
    const durationCounts = new Map<number, number>();
    for (const window of meetingWindows) {
      const mins = window.durationMinutes;
      durationCounts.set(mins, (durationCounts.get(mins) || 0) + 1);
    }

    let optimalMeetingMinutes = SLOT_MINUTES;
    let maxFrequency = 0;
    for (const [mins, freq] of durationCounts) {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        optimalMeetingMinutes = mins;
      }
    }

    // Pairwise overlap analysis
    const pairwiseOverlaps: PairwiseOverlap[] = [];
    const participantArray = Array.from(participants);

    for (let i = 0; i < participantArray.length; i++) {
      for (let j = i + 1; j < participantArray.length; j++) {
        const p1 = participantArray[i];
        const p2 = participantArray[j];
        let overlapSlots = 0;

        for (const availableSet of slotAvailability.values()) {
          if (availableSet.has(p1) && availableSet.has(p2)) {
            overlapSlots++;
          }
        }

        if (overlapSlots > 0) {
          const overlapMinutes = overlapSlots * SLOT_MINUTES;
          const percentage =
            totalSlotsWithCoverage > 0
              ? (overlapSlots / totalSlotsWithCoverage) * 100
              : 0;

          pairwiseOverlaps.push({ pair: [p1, p2], overlapMinutes, percentage });
        }
      }
    }

    pairwiseOverlaps.sort((a, b) => b.overlapMinutes - a.overlapMinutes);

    // Heatmap data (date string to participant count - aggregate slots per day)
    const heatmapData = new Map<string, number>();
    for (const [key, participantSet] of slotAvailability) {
      const dateStr = key.split("T")[0];
      const current = heatmapData.get(dateStr) || 0;
      if (participantSet.size > current) {
        heatmapData.set(dateStr, participantSet.size);
      }
    }

    // Best day of week analysis
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const daySlotCounts = new Array<number>(7).fill(0);
    const dayParticipantTotals = new Array<number>(7).fill(0);

    for (const [key, participantSet] of slotAvailability) {
      const dayIndex = parseSlotKey(key).getDay();
      daySlotCounts[dayIndex]++;
      dayParticipantTotals[dayIndex] += participantSet.size;
    }

    const dayOfWeekBreakdown: DayOfWeekMetric[] = dayNames
      .map((day, index) => ({
        day,
        slots: daySlotCounts[index],
        avgParticipants:
          daySlotCounts[index] > 0
            ? dayParticipantTotals[index] / daySlotCounts[index]
            : 0,
      }))
      .filter((d) => d.slots > 0);

    const bestDayOfWeek =
      dayOfWeekBreakdown.length > 0
        ? dayOfWeekBreakdown.reduce((best, current) =>
            current.avgParticipants > best.avgParticipants ? current : best
          )
        : null;

    // Peak hours analysis (only meaningful when time events exist)
    const peakHours: PeakHourMetric[] = [];
    if (hasTimeEvents) {
      const hourSlotCounts = new Array<number>(24).fill(0);
      const hourParticipantTotals = new Array<number>(24).fill(0);

      for (const [key, participantSet] of slotAvailability) {
        const hour = parseSlotKey(key).getHours();
        hourSlotCounts[hour]++;
        hourParticipantTotals[hour] += participantSet.size;
      }

      for (let h = 0; h < 24; h++) {
        if (hourSlotCounts[h] > 0) {
          let label: string;
          if (timeFormat === "24h") {
            label = `${String(h).padStart(2, "0")}:00`;
          } else {
            const period = h < 12 ? "AM" : "PM";
            let displayHour = h % 12;
            if (displayHour === 0) {
              displayHour = 12;
            }
            label = `${displayHour}${period}`;
          }
          peakHours.push({
            hour: h,
            label,
            avgParticipants: hourParticipantTotals[h] / hourSlotCounts[h],
            totalSlots: hourSlotCounts[h],
          });
        }
      }

      // Sort by average participants descending
      peakHours.sort((a, b) => b.avgParticipants - a.avgParticipants);
    }

    return {
      totalParticipants,
      everyoneAvailable: commonRanges.length > 0,
      hasTimeEvents,
      earliestDate,
      latestDate,
      earliestRange,
      latestRange,
      commonRanges,
      longest,
      longestDurationMinutes,
      totalSlotsWithCoverage,
      totalCalendarSlots,
      coveragePercentage,
      averageParticipantsPerSlot,
      participantMetrics,
      mostAvailable,
      leastAvailable,
      topMeetingWindows,
      weekendSlots,
      weekdaySlots,
      optimalMeetingMinutes,
      pairwiseOverlaps,
      heatmapData,
      bestDayOfWeek,
      dayOfWeekBreakdown,
      peakHours,
    };
  }, [events, timeFormat]);

  if (!metrics) {
    return (
      <div className="space-y-4">
        <Card id="tour-step-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <CalendarHeartIcon className="size-5 lg:size-6" />
              Availability Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add events to see availability metrics.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <MagnifyingGlassIcon className="size-5 lg:size-6" />
              Best Meeting Windows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add events to see best meeting windows.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <UserCheckIcon className="size-5 lg:size-6" />
              Individual Availability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add events to see individual availability.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <ChartBarIcon className="size-5 lg:size-6" />
              Coverage Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add events to see coverage analysis.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <UsersIcon className="size-5 lg:size-6" />
              Pairwise Overlap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Add more participants to see pairwise overlap.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /** Formats a date range, showing times when events have specific times. */
  const formatDateRange = (range: DateRange) => {
    const durationMs = range.end.getTime() - range.start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    // Check if this range aligns to full days (start at midnight, end at midnight)
    const startsAtMidnight =
      range.start.getHours() === 0 && range.start.getMinutes() === 0;
    const endsAtMidnight =
      range.end.getHours() === 0 && range.end.getMinutes() === 0;
    const isFullDays =
      startsAtMidnight && endsAtMidnight && durationMinutes >= 24 * 60;

    if (isFullDays) {
      const adjustedEnd = new Date(range.end.getTime() - 24 * 60 * 60 * 1000);
      if (
        format(range.start, "yyyy-MM-dd") === format(adjustedEnd, "yyyy-MM-dd")
      ) {
        return format(range.start, "MMM d, yyyy");
      }
      return `${format(range.start, "MMM d")} - ${format(adjustedEnd, "MMM d, yyyy")}`;
    }

    // Show times for sub-day ranges
    if (format(range.start, "yyyy-MM-dd") === format(range.end, "yyyy-MM-dd")) {
      return `${format(range.start, `MMM d, ${timeFmt}`)} - ${format(range.end, timeFmt)}`;
    }
    return `${format(range.start, `MMM d, ${timeFmt}`)} - ${format(range.end, `MMM d, ${timeFmt}, yyyy`)}`;
  };

  const participantColorMap = new Map<string, string>();
  for (const event of events) {
    participantColorMap.set(event.title, event.color);
  }

  /** Context-aware label for coverage stats. */
  const coverageUnitLabel = metrics.hasTimeEvents ? "slots" : "days";
  const totalCoverageCount = metrics.hasTimeEvents
    ? metrics.totalSlotsWithCoverage
    : Math.ceil((metrics.totalSlotsWithCoverage * SLOT_MINUTES) / (24 * 60));
  const totalCalendarCount = metrics.hasTimeEvents
    ? metrics.totalCalendarSlots
    : Math.ceil((metrics.totalCalendarSlots * SLOT_MINUTES) / (24 * 60));

  return (
    <div className="space-y-4 overflow-y-auto">
      {/* Main Overview Card */}
      <Card id="tour-step-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <CalendarHeartIcon className="size-5 lg:size-6" />
            Availability Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <UsersIcon className="size-5 text-muted-foreground" />
              <span>
                <strong>{metrics.totalParticipants}</strong> participant
                {metrics.totalParticipants !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PulseIcon className="size-5 text-muted-foreground" />
              <span>
                <strong>{metrics.averageParticipantsPerSlot.toFixed(1)}</strong>{" "}
                avg/{metrics.hasTimeEvents ? "slot" : "day"}
              </span>
            </div>
          </div>

          {metrics.everyoneAvailable ? (
            <div className="flex items-center gap-x-2 rounded-lg bg-green-50 p-2.5 dark:bg-green-950/30">
              <SealCheckIcon className="size-5 text-green-500" />
              <p className="font-medium text-green-900 text-sm dark:text-green-100">
                {metrics.commonRanges.length} time
                {metrics.commonRanges.length !== 1 ? "s" : ""} when everyone is
                available!
              </p>
            </div>
          ) : (
            <div className="flex gap-x-2 rounded-lg bg-yellow-50 p-2.5 dark:bg-yellow-950/30">
              <WarningOctagonIcon className="size-5 shrink-0 text-yellow-500" />
              <p className="font-medium text-sm text-yellow-900 dark:text-yellow-100">
                No time works for everyone
              </p>
            </div>
          )}

          <Separator />

          {/* Date Range Metrics */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-sm">
              <CalendarStarIcon className="size-5" />
              Best Overlap Dates
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              {metrics.earliestDate && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Earliest Best Date
                  </p>
                  <p className="font-medium">
                    {metrics.hasTimeEvents
                      ? format(metrics.earliestDate, `MMM d, yyyy ${timeFmt}`)
                      : format(metrics.earliestDate, "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {metrics.latestDate && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Latest Best Date
                  </p>
                  <p className="font-medium">
                    {metrics.hasTimeEvents
                      ? format(metrics.latestDate, `MMM d, yyyy ${timeFmt}`)
                      : format(metrics.latestDate, "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {metrics.earliestRange && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Earliest Best Range
                  </p>
                  <p className="font-medium text-xs">
                    {formatDateRange(metrics.earliestRange)}
                  </p>
                </div>
              )}
              {metrics.latestRange && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Latest Best Range
                  </p>
                  <p className="font-medium text-xs">
                    {formatDateRange(metrics.latestRange)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {metrics.longest && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <ClockIcon className="size-5" />
                  Longest Common Availability
                </h3>
                <div className="space-y-1 rounded-lg border p-3">
                  <p className="font-medium text-sm">
                    {formatDuration(metrics.longestDurationMinutes)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateRange(metrics.longest)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Best Meeting Windows */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <MagnifyingGlassIcon className="size-5 lg:size-6" />
            Best Meeting Windows
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 space-y-3 overflow-y-auto">
          {metrics.topMeetingWindows.slice(0, 5).map((window) => (
            <div
              className="space-y-2 rounded-lg border p-3"
              key={`${window.range.start.getTime()}-${window.count}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {window.count}/{metrics.totalParticipants} participants
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateRange(window.range)} (
                    {formatDuration(window.durationMinutes)})
                  </p>
                </div>
                {window.count === metrics.totalParticipants && (
                  <Badge className="text-xs" variant="default">
                    All
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {window.participants.map((p) => (
                  <Badge
                    className="text-xs"
                    key={p}
                    style={{
                      backgroundColor: participantColorMap.get(p) || undefined,
                    }}
                    variant="outline"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Individual Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <UserCheckIcon className="size-5 lg:size-6" />
            Individual Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-57 space-y-4 overflow-y-auto">
          {metrics.participantMetrics.map((participant) => (
            <div className="space-y-2" key={participant.name}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="mr-1.5 h-6 w-1 rounded-full"
                    style={{
                      backgroundColor: participantColorMap.get(
                        participant.name
                      ),
                    }}
                  />
                  <span className="font-medium text-sm">
                    {participant.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs" variant="secondary">
                    {formatDuration(participant.totalMinutes)}
                  </Badge>
                  {participant === metrics.mostAvailable && (
                    <Badge className="text-xs" variant="default">
                      <TrendUpIcon className="mr-1 size-3" />
                      Most
                    </Badge>
                  )}
                  {participant === metrics.leastAvailable &&
                    metrics.participantMetrics.length > 1 && (
                      <Badge className="text-xs" variant="outline">
                        <TrendDownIcon className="mr-1 size-3" />
                        Least
                      </Badge>
                    )}
                </div>
              </div>
              <Progress
                aria-label={`Availability for ${participant.name}: ${participant.percentage.toFixed(1)}%`}
                className="h-1.5"
                value={participant.percentage}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coverage Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <ChartBarIcon className="size-5 lg:size-6" />
            Coverage Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Calendar Coverage</span>
              <span className="font-medium">
                {metrics.coveragePercentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              aria-label={`Calendar coverage: ${metrics.coveragePercentage.toFixed(1)}%`}
              className="h-2"
              value={metrics.coveragePercentage}
            />
            <p className="text-muted-foreground text-xs">
              {totalCoverageCount} of {totalCalendarCount} {coverageUnitLabel}{" "}
              have at least one person available
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-muted-foreground text-xs">
                <CalendarDotsIcon className="size-3" />
                Weekdays
              </p>
              <p className="font-medium">
                {formatDuration(metrics.weekdaySlots * SLOT_MINUTES)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-muted-foreground text-xs">
                <CalendarDotsIcon className="size-3" />
                Weekends
              </p>
              <p className="font-medium">
                {formatDuration(metrics.weekendSlots * SLOT_MINUTES)}
              </p>
            </div>
          </div>

          {metrics.optimalMeetingMinutes > SLOT_MINUTES && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
              <p className="text-sm">
                <span className="font-medium">Optimal meeting length:</span>{" "}
                <span className="text-blue-700 dark:text-blue-300">
                  {formatDuration(metrics.optimalMeetingMinutes)}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Day of Week & Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <SunIcon className="size-5 lg:size-6" />
            Day &amp; Time Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Best Day of Week */}
          {metrics.bestDayOfWeek && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Best Day of Week</h3>
              <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950/30">
                <p className="text-sm">
                  <span className="font-medium text-purple-700 dark:text-purple-300">
                    {metrics.bestDayOfWeek.day}
                  </span>{" "}
                  has the highest overlap (
                  {metrics.bestDayOfWeek.avgParticipants.toFixed(1)} avg
                  participants)
                </p>
              </div>
              <div className="space-y-2">
                {metrics.dayOfWeekBreakdown.map((dayMetric) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={dayMetric.day}
                  >
                    <span className="w-8 text-muted-foreground">
                      {dayMetric.day}
                    </span>
                    <div className="mx-2 flex-1">
                      <Progress
                        aria-label={`${dayMetric.day}: ${dayMetric.avgParticipants.toFixed(1)} avg participants`}
                        className="h-1.5"
                        value={
                          (dayMetric.avgParticipants /
                            metrics.totalParticipants) *
                          100
                        }
                      />
                    </div>
                    <span className="w-20 text-right text-muted-foreground text-xs">
                      {formatDuration(dayMetric.slots * SLOT_MINUTES)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peak Hours */}
          {metrics.peakHours.length > 0 && (
            <>
              {metrics.bestDayOfWeek && <Separator />}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Peak Hours</h3>
                <div className="space-y-2">
                  {metrics.peakHours.slice(0, 5).map((hourMetric) => (
                    <div
                      className="flex items-center justify-between text-sm"
                      key={hourMetric.hour}
                    >
                      <span className="w-10 text-muted-foreground text-xs">
                        {hourMetric.label}
                      </span>
                      <div className="mx-2 flex-1">
                        <Progress
                          aria-label={`${hourMetric.label}: ${hourMetric.avgParticipants.toFixed(1)} avg participants`}
                          className="h-1.5"
                          value={
                            (hourMetric.avgParticipants /
                              metrics.totalParticipants) *
                            100
                          }
                        />
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {hourMetric.avgParticipants.toFixed(1)} avg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!metrics.bestDayOfWeek && metrics.peakHours.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Add events to see day and time insights.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Overlap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <UsersIcon className="size-5 lg:size-6" />
            Pairwise Overlap
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-53 space-y-3 overflow-y-auto">
          <p className="text-muted-foreground text-sm">
            {metrics.pairwiseOverlaps.length > 0 && (
              <>How often pairs of participants are available together</>
            )}
            {metrics.pairwiseOverlaps.length === 0 &&
              metrics.totalParticipants < 2 && (
                <>Add more participants to see pairwise overlap.</>
              )}
            {metrics.pairwiseOverlaps.length === 0 &&
              metrics.totalParticipants >= 2 && (
                <>No overlapping availability found between participants.</>
              )}
          </p>
          {metrics.pairwiseOverlaps.map((overlap) => (
            <div
              className="flex items-center justify-between"
              key={`${overlap.pair[0]}-${overlap.pair[1]}`}
            >
              <div className="flex items-center">
                <div
                  className="mr-1.5 h-6 w-1 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${participantColorMap.get(overlap.pair[0])} 0%, ${participantColorMap.get(overlap.pair[0])} 50%, ${participantColorMap.get(overlap.pair[1])} 50%, ${participantColorMap.get(overlap.pair[1])} 100%)`,
                  }}
                />
                <span className="text-sm">
                  {overlap.pair[0]} & {overlap.pair[1]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs" variant="secondary">
                  {formatDuration(overlap.overlapMinutes)}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {overlap.percentage.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Checks if two slot keys are consecutive (15 minutes apart). */
function isConsecutiveSlot(prevKey: string, nextKey: string): boolean {
  const prev = parseSlotKey(prevKey);
  const next = parseSlotKey(nextKey);
  return next.getTime() - prev.getTime() === SLOT_MINUTES * 60 * 1000;
}

/** Groups consecutive slot keys into DateRange objects. */
function groupConsecutiveSlots(sortedKeys: string[]): DateRange[] {
  if (sortedKeys.length === 0) {
    return [];
  }

  const ranges: DateRange[] = [];
  let rangeStart = sortedKeys[0];
  let prevKey = sortedKeys[0];

  for (let i = 1; i < sortedKeys.length; i++) {
    const currentKey = sortedKeys[i];
    if (isConsecutiveSlot(prevKey, currentKey)) {
      prevKey = currentKey;
    } else {
      const endDate = parseSlotKey(prevKey);
      endDate.setMinutes(endDate.getMinutes() + SLOT_MINUTES);
      ranges.push({ start: parseSlotKey(rangeStart), end: endDate });
      rangeStart = currentKey;
      prevKey = currentKey;
    }
  }

  const endDate = parseSlotKey(prevKey);
  endDate.setMinutes(endDate.getMinutes() + SLOT_MINUTES);
  ranges.push({ start: parseSlotKey(rangeStart), end: endDate });

  return ranges;
}

/** Creates a MeetingWindow from a WindowTracker and pushes it to the array. */
function pushMeetingWindow(
  windows: MeetingWindow[],
  tracker: { keys: string[]; participants: Set<string> }
): void {
  const startDate = parseSlotKey(tracker.keys[0]);
  const lastKey = tracker.keys.at(-1) ?? tracker.keys[0];
  const endDate = parseSlotKey(lastKey);
  endDate.setMinutes(endDate.getMinutes() + SLOT_MINUTES);

  windows.push({
    range: { start: startDate, end: endDate },
    participants: Array.from(tracker.participants),
    count: tracker.participants.size,
    durationMinutes: tracker.keys.length * SLOT_MINUTES,
  });
}
