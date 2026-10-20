import { cache } from "react";
import { type Dict, getDictionary, type Locale } from "@/i18n";
import { withOverrides } from "@/i18n/texts";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * The dictionary of a language with the texts rewritten in the dashboard ("Website texts").
 * The rewritten ones are read from the backend at most every 30 seconds; if it does not answer,
 * the site shows its built-in wording.
 */
export const getTexts = cache(async (locale: Locale): Promise<Dict> => {
  const dict = getDictionary(locale);
  try {
    const response = await fetch(`${API_URL}/api/site-texts`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return dict;
    const rows = (await response.json()) as Record<string, Partial<Record<Locale, string | null>>>;
    return withOverrides(dict, Object.fromEntries(Object.entries(rows).map(([key, row]) => [key, row?.[locale]])));
  } catch {
    return dict;
  }
});
