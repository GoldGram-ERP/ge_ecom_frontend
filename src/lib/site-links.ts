import { cache } from "react";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export interface SiteLinks {
  whatsappUrl?: string;
  iosUrl?: string;
  androidUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
}

/**
 * A safe address from what the dashboard stores: an address without a scheme gets https://, a
 * bare WhatsApp number becomes wa.me/<digits>, and anything that is not http(s) is hidden.
 */
export function socialHref(value: string | undefined, whatsapp = false): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  if (whatsapp && !/[:/]/.test(text)) {
    const digits = text.replace(/\D/g, "");
    if (digits) return `https://wa.me/${digits}`;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text.replace(/^\/+/, "")}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The social and app links set in the dashboard. A link left empty, unsafe, or a backend that
 * does not answer hides that link on the website.
 */
export const getLinks = cache(async (): Promise<SiteLinks> => {
  try {
    const response = await fetch(`${API_URL}/api/settings`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["seo-site"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return {};
    const links = (await response.json()) as SiteLinks;
    return {
      whatsappUrl: socialHref(links.whatsappUrl, true),
      iosUrl: socialHref(links.iosUrl),
      androidUrl: socialHref(links.androidUrl),
      instagramUrl: socialHref(links.instagramUrl),
      facebookUrl: socialHref(links.facebookUrl),
      tiktokUrl: socialHref(links.tiktokUrl),
    };
  } catch {
    return {};
  }
});

/**
 * A store link that can be traced (SELL-04): the App Store campaign token (ct) and the Play
 * install referrer carry where on the site the badge was clicked.
 */
export function storeHref(url: string, store: "ios" | "android", placement: string): string {
  try {
    const link = new URL(url);
    if (store === "ios") link.searchParams.set("ct", `website-${placement}`);
    else link.searchParams.set("referrer", `utm_source=goldgram.eg&utm_medium=website&utm_campaign=${placement}`);
    return link.toString();
  } catch {
    return url;
  }
}
