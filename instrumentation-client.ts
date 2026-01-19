import { initBotId } from "botid/client/core";

initBotId({
  protect: [
    {
      path: "/api/calendar/create",
      method: "POST",
    },
    {
      path: "/api/calendar/join",
      method: "POST",
    },
    {
      path: "/api/calendar/*/events",
      method: "POST",
    },
    {
      path: "/api/calendar/*/events",
      method: "DELETE",
    },
    {
      path: "/api/calendar/*/update",
      method: "POST",
    },
    {
      path: "/api/calendar/*/rotate-pin",
      method: "POST",
    },
    {
      path: "/api/cron/cleanup-calendars",
      method: "GET",
    },
  ],
});
