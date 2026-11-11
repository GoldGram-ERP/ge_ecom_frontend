import { cookies } from "next/headers";
import type { Article, FaqEntry, MyOrder, PriceHistory, Prices, Product, Spot, User } from "./types";

// Server Components call the backend directly. Public reads go through Next's data cache with the
// tags the backend revalidates on every save (DSH-04, TEC-02): prices and products at most 60 s old
// and fresh right after a publish. A signed-in read (with the session cookie) is never cached.
const API_URL = process.env.API_URL ?? "http://localhost:4000";
const TIMEOUT_MS = 8000;

/** How long a public read may be served from the cache, and the tags that expire it. */
type Caching = { tags: string[]; revalidate: number };
const PRICES: Caching = { tags: ["prices"], revalidate: 60 };
const PRODUCTS: Caching = { tags: ["products", "prices"], revalidate: 60 };
const ARTICLES: Caching = { tags: ["articles"], revalidate: 300 };
const SETTINGS: Caching = { tags: ["seo-site"], revalidate: 60 };

async function get<T>(path: string, caching?: Caching, cookie?: string): Promise<{ status: number; data: T | null }> {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    ...(caching && !cookie ? { next: caching } : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: (await response.json()) as T };
}

async function required<T>(path: string, caching: Caching): Promise<T> {
  const { status, data } = await get<T>(path, caching);
  if (data === null) throw new Error(`Backend answered ${status} for ${path}`);
  return data;
}

export const getPrices = () => required<Prices>("/prices", PRICES);
export const getProducts = () => required<Product[]>("/products", PRODUCTS);
export const getPriceHistory = (metal: "gold" | "silver", days: number) =>
  required<PriceHistory>(`/prices/history?metal=${metal}&days=${days}`, PRICES);

/** Prices for pages that should still render when the backend is down. */
export async function getPricesOrNull(): Promise<Prices | null> {
  try {
    return await getPrices();
  } catch {
    return null;
  }
}

/** Published articles, newest as the dashboard orders them. Empty when the backend does not answer. */
export async function getArticles(): Promise<Article[]> {
  try {
    return (await get<Article[]>("/articles", ARTICLES)).data ?? [];
  } catch {
    return [];
  }
}

/** One published article, or null (missing or backend down). */
export async function getArticle(id: string): Promise<Article | null> {
  try {
    return (await get<Article>(`/articles/${encodeURIComponent(id)}`, ARTICLES)).data;
  } catch {
    return null;
  }
}

/** Active FAQ entries from the dashboard. Empty when the backend does not answer. */
export async function getFaq(): Promise<FaqEntry[]> {
  try {
    return (await get<FaqEntry[]>("/faq", { tags: ["faq"], revalidate: 60 })).data ?? [];
  } catch {
    return [];
  }
}

/** The international ounce for the first paint of the home page; null while its feed is down. */
export async function getSpotOrNull(): Promise<Spot | null> {
  try {
    const { data } = await get<{ spot: Spot | null }>("/prices/spot", PRICES);
    return data?.spot ?? null;
  } catch {
    return null;
  }
}

/** Whether sold-out pieces still appear in the account screen's "Popular" list (a dashboard setting). */
export async function showOutOfStockHome(): Promise<boolean> {
  try {
    const { data } = await get<{ showOutOfStockHome: boolean }>("/settings", SETTINGS);
    return data?.showOutOfStockHome ?? false;
  } catch {
    return false;
  }
}

/** Whether checkout offers collection from the branch (a dashboard setting). On when the backend does not say. */
export async function branchPickup(): Promise<boolean> {
  try {
    const { data } = await get<{ branchPickup: boolean }>("/settings", SETTINGS);
    return data?.branchPickup ?? true;
  } catch {
    return true;
  }
}

/** Whether at least one active promo code exists, so checkout shows the promo field. Off when the backend does not say. */
export async function promoAvailable(): Promise<boolean> {
  try {
    const { data } = await get<{ available: boolean }>("/discounts/promo-available", { tags: ["products"], revalidate: 60 });
    return data?.available ?? false;
  } catch {
    return false;
  }
}

/** Whether every order needs an uploaded KYC document (a dashboard setting). Off when the backend does not say. */
export async function requireKycDocPerOrder(): Promise<boolean> {
  try {
    const { data } = await get<{ requireKycDocPerOrder: boolean }>("/settings", SETTINGS);
    return data?.requireKycDocPerOrder ?? false;
  } catch {
    return false;
  }
}

async function sessionCookie(): Promise<string | undefined> {
  const value = (await cookies()).get("gg_session")?.value;
  return value ? `gg_session=${value}` : undefined;
}

/** The signed-in customer, or null for a guest. Throws only when the backend cannot be reached. */
export async function getUser(): Promise<User | null> {
  const cookie = await sessionCookie();
  if (!cookie) return null;
  const { data } = await get<{ user: User }>("/auth/me", undefined, cookie);
  return data?.user ?? null;
}

/** The signed-in customer's orders, newest first. Empty for a guest or when the list cannot be read. */
export async function getMyOrders(): Promise<MyOrder[]> {
  const cookie = await sessionCookie();
  if (!cookie) return [];
  try {
    return (await get<MyOrder[]>("/orders/mine", undefined, cookie)).data ?? [];
  } catch {
    return [];
  }
}
