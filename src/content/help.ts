import type { Locale } from "@/i18n";
import ar from "./help.ar.json";
import en from "./help.en.json";

// The 55 help-centre questions. English is extracted from "GoldGram — help centre.html";
// Arabic is a translation of it. An answer is a list of parts so that the points the
// business has not decided yet stay marked "to confirm", as they are in the prototype.
export type HelpPart = string | { tbc: string };

export interface HelpContent {
  categories: { id: string; label: string }[];
  items: { cat: string; q: string; a: HelpPart[] }[];
}

const content: Record<Locale, HelpContent> = { en, ar };

export const getHelp = (locale: Locale): HelpContent => content[locale];
