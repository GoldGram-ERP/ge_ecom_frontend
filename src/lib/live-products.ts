"use client";

import { useEffect, useRef, useState } from "react";
import { useLivePrices } from "./live-prices";
import type { Product } from "./types";

type Priced = Pick<Product, "id" | "pricePiastres" | "metalPiastres" | "laborPiastres" | "gramPiastres">;

/**
 * The products as the server rendered them, with their prices kept current: each new price board
 * reloads the catalogue's prices (the backend does the maths, the same as at checkout), so a page
 * left open never shows yesterday's price. The list itself (which pieces, in which order) is kept.
 */
export function useLiveProducts<T extends Priced>(initial: T[]): T[] {
  const { prices } = useLivePrices();
  const boardAt = prices?.updatedAt ?? null;
  const firstBoard = useRef<string | null>(null);
  const [fresh, setFresh] = useState<{ at: string; byId: Map<number, Priced> } | null>(null);

  useEffect(() => {
    if (!boardAt) return;
    // The stream's first event is the board the page was rendered with.
    if (firstBoard.current === null) {
      firstBoard.current = boardAt;
      return;
    }
    if (boardAt === firstBoard.current) return;
    const controller = new AbortController();
    fetch("/api/products", { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Priced[]>) : null))
      .then((list) => list && setFresh({ at: boardAt, byId: new Map(list.map((p) => [p.id, p])) }))
      .catch(() => {});
    return () => controller.abort();
  }, [boardAt]);

  if (!fresh) return initial;
  return initial.map((p) => {
    const now = fresh.byId.get(p.id);
    return now
      ? { ...p, pricePiastres: now.pricePiastres, metalPiastres: now.metalPiastres, laborPiastres: now.laborPiastres, gramPiastres: now.gramPiastres }
      : p;
  });
}
