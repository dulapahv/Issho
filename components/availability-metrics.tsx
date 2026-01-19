'use client';

import { useMemo } from 'react';

import {
  CalendarDotsIcon,
  CalendarHeartIcon,
  CalendarStarIcon,
  ChartBarIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PulseIcon,
  SealCheckIcon,
  TrendDownIcon,
  TrendUpIcon,
  UserCheckIcon,
  UsersIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react';
import { format } from 'date-fns/format';

import { CalendarEvent } from '@/lib/calendar-store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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
  daysCount: number;
}

interface ParticipantMetrics {
  name: string;
  totalDays: number;
  percentage: number;
  ranges: DateRange[];
}

interface PairwiseOverlap {
  pair: [string, string];
  overlapDays: number;
  percentage: number;
}

interface AvailabilityMetrics {
  // Basic metrics
  totalParticipants: number;
  everyoneAvailable: boolean;

  // Date range metrics (based on maximum participation)
  earliestDate: Date | null;
  latestDate: Date | null;
  earliestRange: DateRange | null;
  latestRange: DateRange | null;

  // Common availability
  commonRanges: DateRange[];
  longest: DateRange | null;
  longestDurationDays: number;

  // Overall coverage
  totalDaysWithCoverage: number;
  totalCalendarDays: number;
  coveragePercentage: number;
  averageParticipantsPerDay: number;

  // Individual insights
  participantMetrics: ParticipantMetrics[];
  mostAvailable: ParticipantMetrics | null;
  leastAvailable: ParticipantMetrics | null;

  // Best meeting windows
  topMeetingWindows: MeetingWindow[];
  weekendAvailability: number;
  weekdayAvailability: number;
  optimalMeetingLength: number;

  // Overlap analysis
  pairwiseOverlaps: PairwiseOverlap[];
  heatmapData: Map<string, number>; // date string to participant count
}

export function AvailabilityMetrics({ events }: AvailabilityMetricsProps) {
  const metrics = useMemo((): AvailabilityMetrics | null => {
    if (events.length === 0) {
      return null;
    }

    // Get unique participants
    const participants = new Set(events.map((e) => e.title));
    const totalParticipants = participants.size;

    // Group events by participant
    const participantEvents = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      if (!participantEvents.has(event.title)) {
        participantEvents.set(event.title, []);
      }
      participantEvents.get(event.title)!.push(event);
    });

    // Find all dates and create daily availability map
    const dailyAvailability = new Map<string, Set<string>>(); // date string to set of available participants

    events.forEach((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);

      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (!dailyAvailability.has(dateStr)) {
          dailyAvailability.set(dateStr, new Set());
        }
        dailyAvailability.get(dateStr)!.add(event.title);
      }
    });

    // Find the maximum number of participants available on any day
    let maxParticipantCount = 0;
    dailyAvailability.forEach((participantSet) => {
      if (participantSet.size > maxParticipantCount) {
        maxParticipantCount = participantSet.size;
      }
    });

    // Find all dates with maximum participation
    const maxParticipationDates: Date[] = [];
    const allDates = Array.from(dailyAvailability.keys()).sort();

    allDates.forEach((dateStr) => {
      const availableSet = dailyAvailability.get(dateStr)!;
      if (availableSet.size === maxParticipantCount) {
        maxParticipationDates.push(new Date(dateStr));
      }
    });

    // Calculate earliest and latest dates based on maximum participation
    const earliestDate =
      maxParticipationDates.length > 0 ? maxParticipationDates[0] : null;
    const latestDate =
      maxParticipationDates.length > 0
        ? maxParticipationDates[maxParticipationDates.length - 1]
        : null;

    // Convert consecutive dates with max participation to ranges
    const maxParticipationRanges: DateRange[] = [];
    if (maxParticipationDates.length > 0) {
      let rangeStart = maxParticipationDates[0];
      let rangeEnd = maxParticipationDates[0];

      for (let i = 1; i < maxParticipationDates.length; i++) {
        const currentDate = maxParticipationDates[i];
        const prevDate = maxParticipationDates[i - 1];

        if (
          currentDate.getTime() - prevDate.getTime() ===
          24 * 60 * 60 * 1000
        ) {
          rangeEnd = currentDate;
        } else {
          maxParticipationRanges.push({
            start: new Date(rangeStart),
            end: new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000),
          });
          rangeStart = currentDate;
          rangeEnd = currentDate;
        }
      }

      maxParticipationRanges.push({
        start: new Date(rangeStart),
        end: new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000),
      });
    }

    // Calculate earliest and latest ranges based on maximum participation
    const earliestRange =
      maxParticipationRanges.length > 0 ? maxParticipationRanges[0] : null;
    const latestRange =
      maxParticipationRanges.length > 0
        ? maxParticipationRanges[maxParticipationRanges.length - 1]
        : null;

    // Find dates where everyone is available
    const everyoneAvailableDates: Date[] = [];

    allDates.forEach((dateStr) => {
      const availableSet = dailyAvailability.get(dateStr)!;
      if (availableSet.size === totalParticipants) {
        everyoneAvailableDates.push(new Date(dateStr));
      }
    });

    // Convert consecutive dates to ranges (for everyone available)
    const commonRanges: DateRange[] = [];
    if (everyoneAvailableDates.length > 0) {
      let rangeStart = everyoneAvailableDates[0];
      let rangeEnd = everyoneAvailableDates[0];

      for (let i = 1; i < everyoneAvailableDates.length; i++) {
        const currentDate = everyoneAvailableDates[i];
        const prevDate = everyoneAvailableDates[i - 1];

        if (
          currentDate.getTime() - prevDate.getTime() ===
          24 * 60 * 60 * 1000
        ) {
          rangeEnd = currentDate;
        } else {
          commonRanges.push({
            start: new Date(rangeStart),
            end: new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000),
          });
          rangeStart = currentDate;
          rangeEnd = currentDate;
        }
      }

      commonRanges.push({
        start: new Date(rangeStart),
        end: new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000),
      });
    }

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

    const longestDurationDays = longest
      ? Math.ceil(
          (longest.end.getTime() - longest.start.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    // Overall coverage metrics - calculate the overall calendar span
    let overallEarliestDate: Date | null = null;
    let overallLatestDate: Date | null = null;

    events.forEach((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);

      if (!overallEarliestDate || start < overallEarliestDate)
        overallEarliestDate = start;
      if (!overallLatestDate || end > overallLatestDate)
        overallLatestDate = end;
    });

    const totalDaysWithCoverage = dailyAvailability.size;
    const totalCalendarDays =
      overallEarliestDate && overallLatestDate
        ? Math.ceil(
            ((overallLatestDate as Date).getTime() -
              (overallEarliestDate as Date).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
    const coveragePercentage =
      totalCalendarDays > 0
        ? (totalDaysWithCoverage / totalCalendarDays) * 100
        : 0;

    let totalParticipantDays = 0;
    dailyAvailability.forEach((participantSet) => {
      totalParticipantDays += participantSet.size;
    });
    const averageParticipantsPerDay =
      totalDaysWithCoverage > 0
        ? totalParticipantDays / totalDaysWithCoverage
        : 0;

    // Individual participant metrics
    const participantMetrics: ParticipantMetrics[] = [];
    participantEvents.forEach((events, name) => {
      const participantDates = new Set<string>();
      const ranges: DateRange[] = [];

      events.forEach((event) => {
        ranges.push({
          start: new Date(event.start),
          end: new Date(event.end),
        });

        const start = new Date(event.start);
        const end = new Date(event.end);
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          participantDates.add(format(d, 'yyyy-MM-dd'));
        }
      });

      const totalDays = participantDates.size;
      const percentage =
        totalDaysWithCoverage > 0
          ? (totalDays / totalDaysWithCoverage) * 100
          : 0;

      participantMetrics.push({
        name,
        totalDays,
        percentage,
        ranges,
      });
    });

    participantMetrics.sort((a, b) => b.totalDays - a.totalDays);
    const mostAvailable = participantMetrics[0] || null;
    const leastAvailable =
      participantMetrics[participantMetrics.length - 1] || null;

    // Find top meeting windows (by participant count)
    const meetingWindows: MeetingWindow[] = [];
    const processedRanges = new Set<string>();

    // Type for tracking current window
    type WindowTracker = { dates: Date[]; participants: Set<string> };

    // Group consecutive dates by participant count
    let currentWindow: WindowTracker | null = null;

    allDates.forEach((dateStr) => {
      const date = new Date(dateStr);
      const availableSet = dailyAvailability.get(dateStr)!;

      if (
        currentWindow !== null &&
        currentWindow.participants.size === availableSet.size &&
        Array.from(currentWindow.participants).every((p) => availableSet.has(p))
      ) {
        currentWindow.dates.push(date);
      } else {
        if (currentWindow !== null && currentWindow.dates.length > 0) {
          const rangeKey = `${format(currentWindow.dates[0], 'yyyy-MM-dd')}-${format(currentWindow.dates[currentWindow.dates.length - 1], 'yyyy-MM-dd')}`;
          if (!processedRanges.has(rangeKey)) {
            processedRanges.add(rangeKey);
            const windowDates = currentWindow.dates;
            const windowParticipants = currentWindow.participants;
            meetingWindows.push({
              range: {
                start: windowDates[0],
                end: new Date(
                  windowDates[windowDates.length - 1].getTime() +
                    24 * 60 * 60 * 1000,
                ),
              },
              participants: Array.from(windowParticipants),
              count: windowParticipants.size,
              daysCount: windowDates.length,
            });
          }
        }
        currentWindow = {
          dates: [date],
          participants: new Set(availableSet),
        };
      }
    });

    if (
      currentWindow !== null &&
      (currentWindow as WindowTracker).dates.length > 0
    ) {
      const windowDates = (currentWindow as WindowTracker).dates;
      const windowParticipants = (currentWindow as WindowTracker).participants;
      meetingWindows.push({
        range: {
          start: windowDates[0],
          end: new Date(
            windowDates[windowDates.length - 1].getTime() + 24 * 60 * 60 * 1000,
          ),
        },
        participants: Array.from(windowParticipants),
        count: windowParticipants.size,
        daysCount: windowDates.length,
      });
    }

    // Sort by participant count, then by duration
    meetingWindows.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.daysCount - a.daysCount;
    });

    const topMeetingWindows = meetingWindows.slice(0, 5);

    // Weekend vs weekday availability
    let weekendDays = 0;
    let weekdayDays = 0;
    dailyAvailability.forEach((_, dateStr) => {
      const day = new Date(dateStr).getDay();
      if (day === 0 || day === 6) {
        weekendDays++;
      } else {
        weekdayDays++;
      }
    });

    const weekendAvailability = weekendDays;
    const weekdayAvailability = weekdayDays;

    // Optimal meeting length (most common range duration)
    const rangeDurations = new Map<number, number>();
    meetingWindows.forEach((window) => {
      const days = window.daysCount;
      rangeDurations.set(days, (rangeDurations.get(days) || 0) + 1);
    });

    let optimalMeetingLength = 1;
    let maxFrequency = 0;
    rangeDurations.forEach((freq, days) => {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        optimalMeetingLength = days;
      }
    });

    // Pairwise overlap analysis
    const pairwiseOverlaps: PairwiseOverlap[] = [];
    const participantArray = Array.from(participants);

    for (let i = 0; i < participantArray.length; i++) {
      for (let j = i + 1; j < participantArray.length; j++) {
        const p1 = participantArray[i];
        const p2 = participantArray[j];
        let overlapDays = 0;

        dailyAvailability.forEach((availableSet) => {
          if (availableSet.has(p1) && availableSet.has(p2)) {
            overlapDays++;
          }
        });

        if (overlapDays > 0) {
          const percentage =
            totalDaysWithCoverage > 0
              ? (overlapDays / totalDaysWithCoverage) * 100
              : 0;

          pairwiseOverlaps.push({
            pair: [p1, p2],
            overlapDays,
            percentage,
          });
        }
      }
    }

    pairwiseOverlaps.sort((a, b) => b.overlapDays - a.overlapDays);

    // Create heatmap data
    const heatmapData = new Map<string, number>();
    dailyAvailability.forEach((participantSet, dateStr) => {
      heatmapData.set(dateStr, participantSet.size);
    });

    return {
      totalParticipants,
      everyoneAvailable: commonRanges.length > 0,
      earliestDate,
      latestDate,
      earliestRange,
      latestRange,
      commonRanges,
      longest,
      longestDurationDays,
      totalDaysWithCoverage,
      totalCalendarDays,
      coveragePercentage,
      averageParticipantsPerDay,
      participantMetrics,
      mostAvailable,
      leastAvailable,
      topMeetingWindows,
      weekendAvailability,
      weekdayAvailability,
      optimalMeetingLength,
      pairwiseOverlaps,
      heatmapData,
    };
  }, [events]);

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

  const formatDateRange = (range: DateRange) => {
    const adjustedEnd = new Date(range.end.getTime() - 24 * 60 * 60 * 1000);
    if (
      format(range.start, 'yyyy-MM-dd') === format(adjustedEnd, 'yyyy-MM-dd')
    ) {
      return format(range.start, 'MMM d, yyyy');
    }
    return `${format(range.start, 'MMM d')} - ${format(adjustedEnd, 'MMM d, yyyy')}`;
  };

  const participantColorMap = new Map<string, string>();
  events.forEach((event) => participantColorMap.set(event.title, event.color));

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
              <UsersIcon className="text-muted-foreground size-5" />
              <span>
                <strong>{metrics.totalParticipants}</strong> participant
                {metrics.totalParticipants !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PulseIcon className="text-muted-foreground size-5" />
              <span>
                <strong>{metrics.averageParticipantsPerDay.toFixed(1)}</strong>{' '}
                avg/day
              </span>
            </div>
          </div>

          {metrics.everyoneAvailable ? (
            <div
              className="flex items-center gap-x-2 rounded-lg bg-green-50 p-2.5
                dark:bg-green-950/30"
            >
              <SealCheckIcon className="size-5 text-green-500" />
              <p
                className="text-sm font-medium text-green-900
                  dark:text-green-100"
              >
                {metrics.commonRanges.length} time
                {metrics.commonRanges.length !== 1 ? 's' : ''} when everyone is
                available!
              </p>
            </div>
          ) : (
            <div
              className="flex gap-x-2 rounded-lg bg-yellow-50 p-2.5
                dark:bg-yellow-950/30"
            >
              <WarningOctagonIcon className="size-5 shrink-0 text-yellow-500" />
              <p
                className="text-sm font-medium text-yellow-900
                  dark:text-yellow-100"
              >
                No time works for everyone
              </p>
            </div>
          )}

          <Separator />

          {/* Date Range Metrics */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
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
                    {format(metrics.earliestDate, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {metrics.latestDate && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Latest Best Date
                  </p>
                  <p className="font-medium">
                    {format(metrics.latestDate, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {metrics.earliestRange && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Earliest Best Range
                  </p>
                  <p className="text-xs font-medium">
                    {formatDateRange(metrics.earliestRange)}
                  </p>
                </div>
              )}
              {metrics.latestRange && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Latest Best Range
                  </p>
                  <p className="text-xs font-medium">
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
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ClockIcon className="size-5" />
                  Longest Common Availability
                </h3>
                <div className="space-y-1 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {metrics.longestDurationDays} consecutive day
                    {metrics.longestDurationDays !== 1 ? 's' : ''}
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
          {metrics.topMeetingWindows.slice(0, 5).map((window, index) => (
            <div key={index} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {window.count}/{metrics.totalParticipants} participants
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateRange(window.range)} ({window.daysCount} day
                    {window.daysCount !== 1 ? 's' : ''})
                  </p>
                </div>
                {window.count === metrics.totalParticipants && (
                  <Badge variant="default" className="text-xs">
                    All
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {window.participants.map((p) => (
                  <Badge
                    key={p}
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: participantColorMap.get(p) || undefined,
                    }}
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
            <div key={participant.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="mr-1.5 h-6 w-1 rounded-full"
                    style={{
                      backgroundColor: participantColorMap.get(
                        participant.name,
                      ),
                    }}
                  />
                  <span className="text-sm font-medium">
                    {participant.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {participant.totalDays} days
                  </Badge>
                  {participant === metrics.mostAvailable && (
                    <Badge variant="default" className="text-xs">
                      <TrendUpIcon className="mr-1 size-3" />
                      Most
                    </Badge>
                  )}
                  {participant === metrics.leastAvailable &&
                    metrics.participantMetrics.length > 1 && (
                      <Badge variant="outline" className="text-xs">
                        <TrendDownIcon className="mr-1 size-3" />
                        Least
                      </Badge>
                    )}
                </div>
              </div>
              <Progress
                value={participant.percentage}
                className="h-1.5"
                aria-label={`Availability for ${participant.name}: ${participant.percentage.toFixed(1)}%`}
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
              value={metrics.coveragePercentage}
              className="h-2"
              aria-label={`Calendar coverage: ${metrics.coveragePercentage.toFixed(1)}%`}
            />
            <p className="text-muted-foreground text-xs">
              {metrics.totalDaysWithCoverage} of {metrics.totalCalendarDays}{' '}
              days have at least one person available
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p
                className="text-muted-foreground flex items-center gap-1
                  text-xs"
              >
                <CalendarDotsIcon className="size-3" />
                Weekdays
              </p>
              <p className="font-medium">{metrics.weekdayAvailability} days</p>
            </div>
            <div className="space-y-1">
              <p
                className="text-muted-foreground flex items-center gap-1
                  text-xs"
              >
                <CalendarDotsIcon className="size-3" />
                Weekends
              </p>
              <p className="font-medium">{metrics.weekendAvailability} days</p>
            </div>
          </div>

          {metrics.optimalMeetingLength > 1 && (
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
              <p className="text-sm">
                <span className="font-medium">Optimal meeting length:</span>{' '}
                <span className="text-blue-700 dark:text-blue-300">
                  {metrics.optimalMeetingLength} days
                </span>
              </p>
            </div>
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
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {metrics.pairwiseOverlaps.length > 0 ? (
              <>How often pairs of participants are available together</>
            ) : metrics.totalParticipants < 2 ? (
              <>Add more participants to see pairwise overlap.</>
            ) : (
              <>No overlapping availability found between participants.</>
            )}
          </p>
          {metrics.pairwiseOverlaps.slice(0, 5).map((overlap, index) => (
            <div key={index} className="flex items-center justify-between">
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
                <Badge variant="secondary" className="text-xs">
                  {overlap.overlapDays} days
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
