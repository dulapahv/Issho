import bcrypt from "bcryptjs";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a deterministic color from a string (name) and return as oklch(...)
export function generateColorFromName(name: string, minContrast = 4.5): string {
  // Simple deterministic hash (32-bit safe)
  let hash = 2_166_136_261 >>> 0; // FNV-ish seed
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619) >>> 0;
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

  // sRGB (0-255) -> linear 0..1 channel
  function srgbToLinearChannel(v: number) {
    const c = v / 255;
    return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }

  // relative luminance for RGB 0-255 (used for contrast)
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
    if (contrast >= minContrast) {
      break;
    }
    // Lower lightness more aggressively for lighter starts
    // step size depends on how far we are from target; larger reductions early
    const step = contrast < minContrast * 0.7 ? 3 : 1;
    light = Math.max(minLightness, light - step);
    if (light === minLightness) {
      break;
    }
  }

  // Convert final RGB (0-255) -> OKLab -> OKLCH
  function rgbToOklch(r8: number, g8: number, b8: number) {
    // linearize
    const r = srgbToLinearChannel(r8);
    const g = srgbToLinearChannel(g8);
    const b = srgbToLinearChannel(b8);

    // linear sRGB -> LMS (via matrix)
    // matrix from sRGB linear to LMS (as used by OKLab conversion)
    const l = 0.412_221_470_8 * r + 0.536_332_536_3 * g + 0.051_445_992_9 * b;
    const m = 0.211_903_498_2 * r + 0.680_699_545_1 * g + 0.107_396_956_6 * b;
    const s = 0.088_302_461_9 * r + 0.281_718_837_6 * g + 0.629_978_700_5 * b;

    // Non-linear transform (cube root)
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    // LMS -> OKLab
    const L = 0.210_454_255_3 * l_ + 0.793_617_785 * m_ - 0.004_072_046_8 * s_;
    const A = 1.977_998_495_1 * l_ - 2.428_592_205 * m_ + 0.450_593_709_9 * s_;
    const B = 0.025_904_037_1 * l_ + 0.782_771_766_2 * m_ - 0.808_675_766 * s_;

    // OKLab -> OKLCH
    const C = Math.sqrt(A * A + B * B);
    let hDeg = (Math.atan2(B, A) * 180) / Math.PI;
    if (hDeg < 0) {
      hDeg += 360;
    }

    return { L, C, h: hDeg };
  }

  // Compute final RGB from HSL
  const [rf, gf, bf] = hslToRgb(hue, sat, light);
  const { L: L_oklab, C: C_oklch, h: h_oklch } = rgbToOklch(rf, gf, bf);

  // Format for CSS: oklch(L% C Hdeg)
  // L in percent (0..100), C is unitless number (we'll show 3 decimal places), h in degrees (rounded)
  const Lpercent = Math.round(L_oklab * 1000) / 10; // one decimal place
  const Crounded = Math.round(C_oklch * 1000) / 1000; // three decimal places
  const hRounded = Math.round(h_oklch);

  return `oklch(${Lpercent}% ${Crounded} ${hRounded}deg)`;
}

// Generate a 6-digit PIN
export function generatePIN(): string {
  return Math.floor(100_000 + Math.random() * 900_000).toString();
}

// Generate a simple calendar ID (8 characters, alphanumeric)
export function generateCalendarId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Generate a calendar name based on current date and time
export function generateCalendarName(): string {
  const now = new Date();

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");

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
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
};
