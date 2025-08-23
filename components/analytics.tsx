'use client';

import {
  Analytics as VercelAnalytics,
  type BeforeSendEvent,
} from '@vercel/analytics/next';

const Analytics = () => (
  <VercelAnalytics
    beforeSend={(event: BeforeSendEvent) => {
      const url = new URL(event.url);
      if (url.pathname === '/') {
        return {
          ...event,
          url: url.toString(),
        };
      } else if (url.pathname.startsWith('/calendar/')) {
        url.pathname = '/calendar';
        return {
          ...event,
          url: url.toString(),
        };
      }

      return null;
    }}
  />
);

export { Analytics };
