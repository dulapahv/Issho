export const IS_DEV_ENV =
  process.env.VERCEL_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENV === 'development' ||
  process.env.NODE_ENV === 'development';
export const BASE_URL = IS_DEV_ENV
  ? 'http://localhost:3000'
  : 'https://issho.dulapahv.dev';

export const NAME = 'Issho';
export const DESCRIPTION =
  'Plan with friends, faster — mark availability and find the best time together, no signup required.';
export const AUTHOR_NAME = 'Dulapah Vibulsanti';
export const AUTHOR_BASE_URL = 'https://dulapahv.dev';
export const AUTHOR_TWITTER_HANDLE = '@dulapahv';
export const CONTACT_URL = 'https://dulapahv.dev/contact';

// Validation limits
export const VALIDATION = {
  CALENDAR_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  EVENT_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 128,
  },
  PIN: {
    LENGTH: 6,
  },
  CALENDAR_ID: {
    LENGTH: 8,
  },
} as const;

// Cleanup configuration
export const CLEANUP = {
  DAYS_UNTIL_DELETION: 90,
  BATCH_SIZE: 100,
  DAYS_WARNING_THRESHOLD: 7, // Warn when calendar will expire in 7 days
  CRON_SCHEDULE: '0 0 * * *', // Midnight UTC
  MAX_FUNCTION_DURATION: 60, // seconds
} as const;

// Error messages organized by category
export const ERROR_MESSAGES = {
  // Bot verification errors
  BOT: {
    VERIFICATION_FAILED: 'You must be a human to perform this action.',
  },

  // Authentication & Authorization errors
  AUTH: {
    MISSING_TOKEN: 'Authorization token is missing or invalid.',
    INVALID_PIN: 'Invalid PIN',
    UNAUTHORIZED: 'Unauthorized access',
  },

  // Calendar errors
  CALENDAR: {
    NOT_FOUND: 'Calendar not found',
    CREATE_FAILED: 'Failed to create calendar',
    UPDATE_FAILED: 'Failed to update calendar',
    JOIN_FAILED: 'Failed to join calendar',
    NAME_REQUIRED: 'Calendar name is required',
    NAME_TOO_SHORT: `Calendar name must be at least ${VALIDATION.CALENDAR_NAME.MIN_LENGTH} character`,
    NAME_TOO_LONG: `Calendar name must be ${VALIDATION.CALENDAR_NAME.MAX_LENGTH} characters or less`,
    ID_AND_PIN_REQUIRED: 'Calendar ID and PIN are required',
    ID_REQUIRED: 'Calendar ID is required',
  },

  // Event errors
  EVENT: {
    CREATE_FAILED: 'Failed to create event',
    DELETE_FAILED: 'Failed to delete event',
    FETCH_FAILED: 'Failed to fetch events',
    UPDATE_FAILED: 'Failed to update event',
    NOT_FOUND: 'Event not found',
    TITLE_REQUIRED: 'Event title is required',
    TITLE_TOO_SHORT: `Event title must be at least ${VALIDATION.EVENT_TITLE.MIN_LENGTH} character`,
    TITLE_TOO_LONG: `Event title must be ${VALIDATION.EVENT_TITLE.MAX_LENGTH} characters or less`,
    REQUIRED_FIELDS: 'Title, start, and end dates are required',
    INVALID_DATE_RANGE: 'End date must be after start date',
    IDS_ARRAY_REQUIRED: 'Event IDs array is required',
    ID_REQUIRED: 'Event ID is required',
  },

  // PIN errors
  PIN: {
    ROTATE_FAILED: 'Failed to rotate PIN',
    INVALID_FORMAT: 'PIN must be a 6-digit number',
    REQUIRED: 'PIN is required',
  },

  // Cleanup errors
  CLEANUP: {
    JOB_FAILED: 'Calendar cleanup job failed',
    STATS_FAILED: 'Failed to get cleanup statistics',
    MANUAL_TRIGGER_FAILED: 'Failed to trigger manual cleanup',
    UNAUTHORIZED_REQUEST: 'Unauthorized cleanup request',
  },

  // General validation errors
  VALIDATION: {
    INVALID_REQUEST_DATA: 'Invalid request data',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    INVALID_DATE_FORMAT: 'Invalid date format',
  },

  // Server errors
  SERVER: {
    INTERNAL_ERROR: 'An internal server error occurred',
    DATABASE_ERROR: 'Database operation failed',
    TRANSACTION_FAILED: 'Transaction failed',
  },
} as const;

// HTTP Status codes for consistency
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CALENDAR: {
    CREATED: 'Calendar created successfully',
    UPDATED: 'Calendar updated successfully',
    JOINED: 'Calendar joined successfully',
    DELETED: 'Calendar deleted successfully',
  },
  EVENT: {
    CREATED: 'Event created successfully',
    UPDATED: 'Event updated successfully',
    DELETED: 'Event deleted successfully',
    DELETED_MULTIPLE: 'Events deleted successfully',
  },
  PIN: {
    ROTATED: 'PIN rotated successfully',
  },
  CLEANUP: {
    NO_CALENDARS: 'No calendars to delete',
    COMPLETED: 'Successfully deleted calendars',
    STATS_RETRIEVED: 'Cleanup statistics retrieved successfully',
  },
} as const;

// Regex patterns for validation
export const PATTERNS = {
  CALENDAR_ID: /^[A-Z0-9]{8}$/,
  PIN: /^\d{6}$/,
  // ISO date format
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
} as const;

// Default values
export const DEFAULTS = {
  CALENDAR_NAME_PREFIX: 'Calendar',
  EVENT_COLOR: '#3B82F6', // Default blue color
  TIMEZONE: 'UTC',
} as const;
