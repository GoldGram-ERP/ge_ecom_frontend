import { fmt, type Dict, type Locale } from "@/i18n";
import { type Category, isWearable, type Product } from "./types";

// Western digits and separators in both languages, as in the Arabic prototype.
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 172600 → "1,726" */
export const pounds = (piastres: number): string => whole.format(Math.round(piastres / 100));

/** 618420 → { int: "6,184", dec: "20", full: "6,184.20" } */
export function poundsParts(piastres: number): { int: string; dec: string; full: string } {
  const [int, dec] = (piastres / 100).toFixed(2).split(".");
  const grouped = whole.format(Number(int));
  return { int: grouped, dec, full: `${grouped}.${dec}` };
}

export function weightText(grams: number): string {
  if (grams === 0.25) return "¼";
  if (grams === 0.5) return "½";
  if (grams === 0.75) return "¾";
  return String(Math.round(grams * 10) / 10);
}

export const weightLabel = (grams: number, t: Dict): string =>
  `${weightText(grams)} ${grams <= 1 ? t.product.gram : t.product.grams}`;

export const karatLabel = (karat: number, t: Dict): string => fmt(t.product.karat, { k: karat });

type Describable = Pick<Product, "category" | "weightGrams" | "karat">;

/** What a piece is besides its weight: "999.9", "21K", "mounted". */
export function productPurity(p: Describable, t: Dict): string {
  if (isWearable(p.category)) return t.product.mounted;
  if (p.category === "bar" && p.karat === 24) return "999.9";
  return karatLabel(p.karat, t);
}

/** The line under a product name: "¼ gram · 999.9", "2 grams · 21K", "1 gram · mounted". */
export const productSub = (p: Describable, t: Dict): string => `${weightLabel(p.weightGrams, t)} · ${productPurity(p, t)}`;

/** The weight written beside a name, so two bars in one cart can be told apart: "¼g". */
export const shortWeight = (grams: number, t: Dict): string => fmt(t.product.shortGram, { w: weightText(grams) });

export const productName = (p: { nameEn: string; nameAr: string }, locale: Locale): string =>
  locale === "ar" ? p.nameAr : p.nameEn;

/** The compact name used on the account screen: "Gold Bar ¼g". */
export function productShortName(p: Describable, t: Dict): string {
  const w = fmt(t.product.shortGram, { w: weightText(p.weightGrams) });
  const template =
    p.category === "bar" ? t.product.shortBar : p.category === "coin" ? t.product.shortCoin : t.product.shortWear;
  return fmt(template, { w });
}

/** The drawn piece of each category. */
const ART_CLASS: Record<string, string> = { bar: "o-bar", coin: "o-coin", wear: "o-ring" };
/** The drawing of a category; one the drawings do not know is drawn as a bar. */
export const artClass = (category: Category): string => ART_CLASS[category] ?? ART_CLASS.bar;

// The drawn object grows with the weight, exactly as in the prototype's shop grid.
const BAR: [number, number][] = [[25, 38], [28, 43], [32, 49], [35, 53], [38, 58], [41, 63], [44, 67], [47, 72], [50, 77]];
const COIN = [37, 42, 48, 54, 60];
const RING: [number, number][] = [[40, 7], [46, 8], [52, 9]];

export function artStyle(category: Category, rank: number): React.CSSProperties {
  if (category === "coin") {
    const size = COIN[Math.min(rank, COIN.length - 1)];
    return { width: size, height: size };
  }
  if (isWearable(category)) {
    const [size, borderWidth] = RING[Math.min(rank, RING.length - 1)];
    return { width: size, height: size, borderWidth };
  }
  const [width, height] = BAR[Math.min(rank, BAR.length - 1)];
  return { width, height };
}

const CAIRO = "Africa/Cairo";

/** "14:32" in Cairo, whatever the visitor's own time zone. */
export const cairoTime = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: CAIRO, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );

/** "11 Oct 2026" in Cairo, with Western digits in both languages. */
export const cairoDate = (iso: string, locale: Locale): string =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { timeZone: CAIRO, day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );

export const cairoHour = (date: Date): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: CAIRO, hour: "2-digit", hour12: false }).format(date)) % 24;

export function durationText(minutes: number, t: Dict): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? fmt(t.account.dur, { h, m }) : fmt(t.account.durMin, { m });
}

/** "▲ 0.8%" pieces: the arrow, the absolute value, and whether it fell. */
export function changeParts(pct: number): { arrow: string; value: string; down: boolean } {
  const value = `${Number(Math.abs(pct).toFixed(2))}%`;
  return { arrow: pct < 0 ? "▼" : pct > 0 ? "▲" : "•", value, down: pct < 0 };
}

/** "▲ 0.8% today" in English, "0.8% ▲ اليوم" in Arabic, as the prototypes set it. */
export function changeLine(pct: number, locale: Locale, word: string): { text: string; down: boolean } {
  const { arrow, value, down } = changeParts(pct);
  return { text: locale === "ar" ? `${value} ${arrow} ${word}` : `${arrow} ${value} ${word}`, down };
}
