import { create } from 'zustand';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
}

export interface CalendarStore {
  calendarId: string | null;
  calendarName: string;
  events: CalendarEvent[];
  isDrawMode: boolean;
  setCalendarId: (id: string) => void;
  setCalendarName: (name: string) => void;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;
  removeEvents: (eventIds: string[]) => void;
  setDrawMode: (isDrawMode: boolean) => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  calendarId: null,
  calendarName: '',
  events: [],
  isDrawMode: true,
  setCalendarId: (id) => set({ calendarId: id }),
  setCalendarName: (name) => set({ calendarName: name }),
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    })),
  removeEvents: (eventIds) =>
    set((state) => ({
      events: state.events.filter((e) => !eventIds.includes(e.id)),
    })),
  setDrawMode: (isDrawMode) => set({ isDrawMode }),
}));
