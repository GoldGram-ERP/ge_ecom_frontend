"use client";

import { useEffect, useState } from "react";
import { useLivePrices } from "./live-prices";
import type { Product } from "./types";

export type Priced = Pick<Product, "id" | "pricePiastres" | "metalPiastres" | "laborPiastres" | "gramPiastres">;

export interface PriceCache {
  at: string;
  byId: Map<number, Priced>;
}

// One catalogue refetch per board per tab, shared by every useLiveProducts reader, even when
// the bundler puts the module in more than one client chunk.
interface Store {
  cache: PriceCache | null;
  queued: string | null;
  running: boolean;
  readers: Set<() => void>;
}
const globalStore = globalThis as typeof globalThis & { __ggLiveProducts?: Store };
const store = (globalStore.__ggLiveProducts ??= {
  cache: null,
  queued: null,
  running: false,
  readers: new Set<() => void>(),
});

/** A board whose timestamp differs is a reason to fetch; the first board always is. */
export function boardNeedsProducts(currentAt: string | null, nextAt: string): boolean {
  return currentAt !== nextAt;
}

/** A failed fetch (fresh null) keeps the previous cache, so the screen keeps its last numbers. */
export function nextPriceCache(at: string, fresh: Priced[] | null, previous: PriceCache | null): PriceCache | null {
  return fresh ? { at, byId: new Map(fresh.map((p) => [p.id, p])) } : previous;
}

/** The server-rendered products with the latest cached prices, per id. */
export function withPrices<T extends Priced>(initial: T[], prices: PriceCache | null): T[] {
  if (!prices) return initial;
  return initial.map((p) => {
    const now = prices.byId.get(p.id);
    return now
      ? { ...p, pricePiastres: now.pricePiastres, metalPiastres: now.metalPiastres, laborPiastres: now.laborPiastres, gramPiastres: now.gramPiastres }
      : p;
  });
}

async function refresh(at: string): Promise<void> {
  store.queued = at;
  if (store.running) return;
  store.running = true;
  while (store.queued && boardNeedsProducts(store.cache?.at ?? null, store.queued)) {
    const target = store.queued;
    store.queued = null;
    let fresh: Priced[] | null = null;
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      if (response.ok) fresh = (await response.json()) as Priced[];
    } catch {
      // Keep the last cache.
    }
    store.cache = nextPriceCache(target, fresh, store.cache);
    if (fresh) for (const reader of store.readers) reader();
  }
  store.running = false;
}

/**
 * The products as the server rendered them, with their prices kept current. Every board event
 * fetches the catalogue once for the whole tab, including the first, so a publish between the
 * server render and the stream connection is not lost.
 */
export function useLiveProducts<T extends Priced>(initial: T[]): T[] {
  const { prices } = useLivePrices();
  const [, setVersion] = useState(0);

  useEffect(() => {
    const reader = () => setVersion((v) => v + 1);
    store.readers.add(reader);
    return () => {
      store.readers.delete(reader);
    };
  }, []);

  useEffect(() => {
    if (prices?.updatedAt) void refresh(prices.updatedAt);
  }, [prices?.updatedAt]);

  return withPrices(initial, store.cache);
}
