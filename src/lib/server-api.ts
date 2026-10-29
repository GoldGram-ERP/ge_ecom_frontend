import { cookies } from "next/headers";
import type { Article, FaqEntry, MyOrder, PriceHistory, Prices, Product, Spot, User } from "./types";

// Server Components call the backend directly. Nothing here is cached: prices move.
const API_URL = process.env.API_URL ?? "http://localhost:4000";
const TIMEOUT_MS = 8000;

async function get<T>(path: string, cookie?: string): Promise<{ status: number; data: T | null }> {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: { Accept: "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: (await response.json()) as T };
}

async function required<T>(path: string): Promise<T> {
  const { status, data } = await get<T>(path);
  if (data === null) throw new Error(`Backend answered ${status} for ${path}`);
  return data;
}

export const getPrices = () => required<Prices>("/prices");
export const getProducts = () => required<Product[]>("/products");
export const getPriceHistory = (metal: "gold" | "silver", days: number) =>
  required<PriceHistory>(`/prices/history?metal=${metal}&days=${days}`);

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
    return (await get<Article[]>("/articles")).data ?? [];
  } catch {
    return [];
  }
}

/** One published article, or null (missing or backend down). */
export async function getArticle(id: string): Promise<Article | null> {
  try {
    return (await get<Article>(`/articles/${encodeURIComponent(id)}`)).data;
  } catch {
    return null;
  }
}

/** Active FAQ entries from the dashboard. Empty when the backend does not answer. */
export async function getFaq(): Promise<FaqEntry[]> {
  try {
    return (await get<FaqEntry[]>("/faq")).data ?? [];
  } catch {
    return [];
  }
}

/** The international ounce for the first paint of the home page; null while its feed is down. */
export async function getSpotOrNull(): Promise<Spot | null> {
  try {
    const { data } = await get<{ spot: Spot | null }>("/prices/spot");
    return data?.spot ?? null;
  } catch {
    return null;
  }
}

/** Whether sold-out pieces still appear in the account screen's "Popular" list (a dashboard setting). */
export async function showOutOfStockHome(): Promise<boolean> {
  try {
    const { data } = await get<{ showOutOfStockHome: boolean }>("/settings");
    return data?.showOutOfStockHome ?? false;
  } catch {
    return false;
  }
}

/** Whether checkout offers collection from the branch (a dashboard setting). On when the backend does not say. */
export async function branchPickup(): Promise<boolean> {
  try {
    const { data } = await get<{ branchPickup: boolean }>("/settings");
    return data?.branchPickup ?? true;
  } catch {
    return true;
  }
}

/** Whether at least one active promo code exists, so checkout shows the promo field. Off when the backend does not say. */
export async function promoAvailable(): Promise<boolean> {
  try {
    const { data } = await get<{ available: boolean }>("/discounts/promo-available");
    return data?.available ?? false;
  } catch {
    return false;
  }
}

/** Whether every order needs an uploaded KYC document (a dashboard setting). Off when the backend does not say. */
export async function requireKycDocPerOrder(): Promise<boolean> {
  try {
    const { data } = await get<{ requireKycDocPerOrder: boolean }>("/settings");
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
  const { data } = await get<{ user: User }>("/auth/me", cookie);
  return data?.user ?? null;
}

/** The signed-in customer's orders, newest first. Empty for a guest or when the list cannot be read. */
export async function getMyOrders(): Promise<MyOrder[]> {
  const cookie = await sessionCookie();
  if (!cookie) return [];
  try {
    return (await get<MyOrder[]>("/orders/mine", cookie)).data ?? [];
  } catch {
    return [];
  }
}
