/**
 * Shared form validation for NammaSpot.
 *
 * One source of truth used by the browser forms (inline errors on blur/submit)
 * and by the server write proxy (src/lib/sheets.functions.ts), so a malformed
 * value can never reach the sheet even if the client checks are bypassed.
 */

import { z } from "zod";

/* --------------------------------- phone ---------------------------------- */

/** Keeps only digits, drops a leading 0 / 91 country prefix. */
export function phoneDigits(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/** True for a valid Indian mobile number (10 digits, starting 6-9). */
export const isIndianPhone = (raw: string) => /^[6-9]\d{9}$/.test(phoneDigits(raw));

/** "+91 98401 12233" — display format. */
export const formatIndianPhone = (raw: string) => {
  const d = phoneDigits(raw);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : raw;
};

/** "919840112233" — storage/WhatsApp format. */
export const toWhatsappNumber = (raw: string) => `91${phoneDigits(raw)}`;

export const PHONE_ERROR = "Invalid phone format";

export const phoneSchema = z
  .string()
  .trim()
  .refine(isIndianPhone, PHONE_ERROR)
  .transform(toWhatsappNumber);

/* --------------------------------- email ---------------------------------- */

export const EMAIL_ERROR = "Invalid email address";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, EMAIL_ERROR)
  .regex(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, EMAIL_ERROR);

/* ------------------------------- instagram -------------------------------- */

export const INSTAGRAM_ERROR = "Handle must start with @ and be 2-30 characters";

/** Strips a leading @ and lowercases; instagram handles are case-insensitive. */
export const normalizeHandle = (raw: string) =>
  (raw ?? "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

export const isInstagramHandle = (raw: string) => /^[a-z0-9._]{2,30}$/.test(normalizeHandle(raw));

/** Stored without the @, validated as if it had one. */
export const instagramSchema = z
  .string()
  .trim()
  .refine(isInstagramHandle, INSTAGRAM_ERROR)
  .transform(normalizeHandle);

/* ----------------------------- business name ------------------------------ */

export const BUSINESS_NAME_ERROR = "Use 3-50 letters, spaces or hyphens";

export const businessNameSchema = z
  .string()
  .trim()
  .min(3, BUSINESS_NAME_ERROR)
  .max(50, BUSINESS_NAME_ERROR)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} -]*$/u, BUSINESS_NAME_ERROR);

export const isBusinessName = (raw: string) => businessNameSchema.safeParse(raw).success;

/** People / category names: same rules, slightly looser length. */
export const personNameSchema = z
  .string()
  .trim()
  .min(2, "Use 2-50 letters, spaces or hyphens")
  .max(50, "Use 2-50 letters, spaces or hyphens")
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} .-]*$/u, "Use 2-50 letters, spaces or hyphens");

/* ------------------------------ products ---------------------------------- */

export const PRODUCT_NAME_ERROR = "Name must be 2-100 characters";
export const PRICE_ERROR = "Price must be between ₹1 and ₹99,999";
export const UNIT_ERROR = "Select a unit";

export const PRODUCT_UNITS = [
  "piece",
  "kg",
  "500 g",
  "dozen",
  "box",
  "set",
  "pair",
  "metre",
  "hour",
  "session",
  "booking",
] as const;

export const productNameSchema = z
  .string()
  .trim()
  .min(2, PRODUCT_NAME_ERROR)
  .max(100, PRODUCT_NAME_ERROR);

export const priceSchema = z.coerce.number().int(PRICE_ERROR).min(1, PRICE_ERROR).max(99999, PRICE_ERROR);

export const unitSchema = z.enum(PRODUCT_UNITS, { message: UNIT_ERROR });

export const productSchema = z.object({
  name: productNameSchema,
  price: priceSchema,
  unit: unitSchema,
  description: z.string().trim().max(400, "Keep the description under 400 characters"),
});

/* -------------------------------- images ---------------------------------- */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_SIZE_ERROR = "Image must be under 5MB";
export const IMAGE_TYPE_ERROR = "Only JPEG, PNG or WebP images are allowed";

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Returns an error message, or null when the file is acceptable. */
export function checkImageFile(file: File, maxBytes = MAX_IMAGE_BYTES): string | null {
  if (!IMAGE_TYPES.includes(file.type.toLowerCase())) return IMAGE_TYPE_ERROR;
  if (file.size > maxBytes) return IMAGE_SIZE_ERROR;
  return null;
}

/* -------------------------------- search ---------------------------------- */

export const MAX_SEARCH_LENGTH = 60;

/** Search boxes: trim control characters and cap the length. */
export const sanitizeSearch = (raw: string) =>
  (raw ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f<>]/g, "")
    .slice(0, MAX_SEARCH_LENGTH);

/* -------------------------------- helpers --------------------------------- */

/** Flattens a zod error into `{ field: message }` for inline display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
