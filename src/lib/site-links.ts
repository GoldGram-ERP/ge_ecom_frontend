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
 * The social and app links set in the dashboard, read at most every 30 seconds. A link left empty,
 * or a backend that does not answer, hides that link on the website.
 */
export const getLinks = cache(async (): Promise<SiteLinks> => {
  try {
    const response = await fetch(`${API_URL}/api/settings`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as SiteLinks) : {};
  } catch {
    return {};
  }
});
