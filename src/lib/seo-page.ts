import type { Metadata } from "next";
import { headers } from "next/headers";
import type { Locale } from "@/i18n";
import { pageMetadata, type PageSeoInput, utilityMetadata } from "./seo";
import { getBusiness, getSeoEntry, getTemplates } from "./seo-data";

// Page-level SEO. Public pages take their canonical query from params (routeParams), so their HTML
// can be cached; only requestMetadata reads the request. Kept apart from seo-data.ts, which
// components shared with the browser bundle also import.

export type SeoPageInput = Omit<PageSeoInput, "entry" | "templates" | "siteName" | "query" | "defaultImage"> & {
  /** The canonical query, from routeParams. */
  query: string;
  /** Where the entry lives: GET /seo/entries/:entryType/:key. */
  entryType: string;
  key: string;
};

/** generateMetadata for a page: its entry first, then the page-type template (DSH-01/02). */
export async function seoMetadata(input: SeoPageInput): Promise<Metadata> {
  const [entry, templates, business] = await Promise.all([getSeoEntry(input.entryType, input.key), getTemplates(), getBusiness()]);
  return pageMetadata({
    ...input,
    entry,
    templates,
    siteName: business.siteName[input.locale],
    defaultImage: business.defaultOgImageUrl || undefined,
  });
}

/**
 * The head of the pages rendered per request (account, checkout, sign-in...): noindex, follow with a
 * self canonical. The proxy passes the path and the canonical query on (x-gg-path, x-gg-query).
 * Reading the request makes the page dynamic, so no cached page may call this.
 */
export async function requestMetadata(locale: Locale): Promise<Metadata> {
  const [request, business] = await Promise.all([headers(), getBusiness()]);
  return utilityMetadata({ locale, path: request.get("x-gg-path") || "/", query: request.get("x-gg-query") ?? "", siteName: business.siteName[locale] });
}
