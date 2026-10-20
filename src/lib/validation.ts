// The same field rules the backend enforces (docs/SPEC.md, "Field rules").
// Checked here first so a customer gets an answer before anything is sent.

export const GOVERNORATES = [
  "cairo", "giza", "alexandria", "qalyubia", "dakahlia", "sharqia", "gharbia", "monufia", "beheira",
  "kafr_el_sheikh", "damietta", "port_said", "ismailia", "suez", "faiyum", "beni_suef", "minya", "asyut",
  "sohag", "qena", "luxor", "aswan", "red_sea", "matrouh", "new_valley", "north_sinai", "south_sinai",
] as const;
export type Governorate = (typeof GOVERNORATES)[number];

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits to 0-9. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** An Egyptian mobile as `01xxxxxxxxx`, or null when it is not one. */
export function normalizePhone(raw: string): string | null {
  let s = toLatinDigits(raw).replace(/[\s\-().]/g, "");
  if (s.startsWith("+20")) s = `0${s.slice(3)}`;
  else if (s.startsWith("0020")) s = `0${s.slice(4)}`;
  return /^01[0125]\d{8}$/.test(s) ? s : null;
}

// Governorate-of-birth codes printed in digits 8-9 of the national ID.
const ID_GOVERNORATE_CODES = new Set([
  "01", "02", "03", "04", "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "31", "32", "33", "34", "35", "88",
]);

/** A well-formed Egyptian national ID as 14 Latin digits, or null. Format only, no registry check. */
export function normalizeNationalId(raw: string, now: Date = new Date()): string | null {
  const s = toLatinDigits(raw).replace(/\s/g, "");
  if (!/^[23]\d{13}$/.test(s)) return null;
  const year = (s[0] === "2" ? 1900 : 2000) + Number(s.slice(1, 3));
  const month = Number(s.slice(3, 5));
  const day = Number(s.slice(5, 7));
  const born = new Date(Date.UTC(year, month - 1, day));
  const realDate = born.getUTCFullYear() === year && born.getUTCMonth() === month - 1 && born.getUTCDate() === day;
  if (!realDate || born.getTime() > now.getTime()) return null;
  return ID_GOVERNORATE_CODES.has(s.slice(7, 9)) ? s : null;
}

/** A passport number as typed, or null. Countries differ, so only the shape is checked: 5 to 20 letters and digits. */
export function normalizePassport(raw: string): string | null {
  const s = raw.trim();
  return /^[A-Za-z0-9]{5,20}$/.test(s) ? s : null;
}

export function isEmail(value: string): boolean {
  const s = value.trim();
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export const isPassword = (value: string): boolean => value.length >= 8 && value.length <= 128;
