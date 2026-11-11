import type { Metadata } from "next";
import { headers } from "next/headers";
import { pageMetadata, type PageSeoInput } from "./seo";
import { getBusiness, getSeoEntry, getTemplates } from "./seo-data";

// Page-level SEO that reads the request (the canonical query the proxy passes on). Kept apart from
// seo-data.ts, which components shared with the browser bundle also import.

/** The canonical query of this request: the proxy strips tracking parameters (x-gg-query). */
export const requestQuery = async () => (await headers()).get("x-gg-query") ?? "";

export type SeoPageInput = Omit<PageSeoInput, "entry" | "templates" | "siteName" | "query" | "defaultImage"> & {
  /** Where the entry lives: GET /seo/entries/:entryType/:key. */
  entryType: string;
  key: string;
};

/** generateMetadata for a page: its entry first, then the page-type template (DSH-01/02). */
export async function seoMetadata(input: SeoPageInput): Promise<Metadata> {
  const [entry, templates, business, query] = await Promise.all([getSeoEntry(input.entryType, input.key), getTemplates(), getBusiness(), requestQuery()]);
  return pageMetadata({
    ...input,
    entry,
    templates,
    query,
    siteName: business.siteName[input.locale],
    defaultImage: business.defaultOgImageUrl || undefined,
  });
}

