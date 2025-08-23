import bcrypt from 'bcryptjs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a deterministic color from a string (name)
export function generateColorFromName(name: string, minContrast = 4.5): string {
  // Simple deterministic hash (32-bit safe)
  let hash = 2166136261 >>> 0; // FNV-ish seed
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  // Use pieces of the hash to derive H,S,L
  const hue = hash % 360; // 0-359
  const sat = 45 + ((hash >>> 8) % 45); // 45-89% saturation (avoid too gray)
  // Start lightness in a mid-range biased by hash, then we'll adjust for contrast
  let light = 40 + ((hash >>> 16) % 30); // 40-69%

  // Helpers: HSL -> RGB (0-255)
  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r1 = 0,
      g1 = 0,
      b1 = 0;
    if (hh >= 0 && hh < 1) {
      r1 = c;
      g1 = x;
      b1 = 0;
    } else if (hh >= 1 && hh < 2) {
      r1 = x;
      g1 = c;
      b1 = 0;
    } else if (hh >= 2 && hh < 3) {
      r1 = 0;
      g1 = c;
      b1 = x;
    } else if (hh >= 3 && hh < 4) {
      r1 = 0;
      g1 = x;
      b1 = c;
    } else if (hh >= 4 && hh < 5) {
      r1 = x;
      g1 = 0;
      b1 = c;
    } else {
      r1 = c;
      g1 = 0;
      b1 = x;
    }
    const m = l - c / 2;
    return [
      Math.round((r1 + m) * 255),
      Math.round((g1 + m) * 255),
      Math.round((b1 + m) * 255),
    ];
  }

  // sRGB -> linear channel
  function srgbToLinearChannel(v: number) {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  // relative luminance for RGB 0-255
  function relativeLuminance(r: number, g: number, b: number) {
    const R = srgbToLinearChannel(r);
    const G = srgbToLinearChannel(g);
    const B = srgbToLinearChannel(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  // contrast ratio white (#fff) vs bg
  function contrastWithWhite(r: number, g: number, b: number) {
    const Lbg = relativeLuminance(r, g, b);
    const Lwhite = 1.0;
    return (Lwhite + 0.05) / (Lbg + 0.05);
  }

  // Try lowering lightness until minContrast is met or we hit a safe min
  const minLightness = 6; // don't go absolute black — still deterministic
  for (let iter = 0; iter < 100; iter++) {
    const [r, g, b] = hslToRgb(hue, sat, light);
    const contrast = contrastWithWhite(r, g, b);
    if (contrast >= minContrast) break;
    // Lower lightness more aggressively for lighter starts
    // step size depends on how far we are from target; larger reductions early
    const step = contrast < minContrast * 0.7 ? 3 : 1;
    light = Math.max(minLightness, light - step);
    if (light === minLightness) break;
  }

  // Round values when returning string
  const hRounded = Math.round(hue);
  const sRounded = Math.round(sat);
  const lRounded = Math.round(light);

  return `hsl(${hRounded}, ${sRounded}%, ${lRounded}%)`;
}

// Generate a 6-digit PIN
export function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a simple calendar ID (8 characters, alphanumeric)
export function generateCalendarId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Generate a calendar name based on current date and time
export function generateCalendarName(): string {
  const now = new Date();

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${day} ${month} ${year} - ${hours}:${minutes}:${seconds}`;
}

// Hash PIN using bcrypt (for database storage)
export async function hashPINForDB(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

// Verify PIN against hash
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

// Parse error to get a user-friendly message
export const parseError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return 'An unknown error occurred';
};
