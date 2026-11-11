"use client";

import { useSyncExternalStore } from "react";

// The cart is a list of product ids and quantities kept in localStorage. It never holds
// prices: the server prices every order, so a stale or edited cart cannot change a total.

export interface CartLine {
  productId: number;
  qty: number;
}

const KEY = "gg_cart_v1";
export const MAX_LINES = 50;
export const MAX_QTY = 99;
const EMPTY: CartLine[] = [];

/** Anything that is not a clean list of lines (old format, hand-edited, corrupt) becomes an empty cart. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const seen = new Set<number>();
    const lines: CartLine[] = [];
    for (const item of data) {
      const productId = (item as CartLine)?.productId;
      const qty = (item as CartLine)?.qty;
      if (!Number.isInteger(productId) || productId <= 0 || seen.has(productId)) continue;
      if (!Number.isInteger(qty) || qty < 1) continue;
      seen.add(productId);
      lines.push({ productId, qty: Math.min(qty, MAX_QTY) });
      if (lines.length === MAX_LINES) break;
    }
    return lines.length ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** The most of one piece a cart may hold: its stock when the shop counts it, and never over MAX_QTY. */
export const qtyLimit = (stock?: number | null): number => Math.min(MAX_QTY, stock ?? MAX_QTY);

/** How many of a piece the cart holds. */
export const qtyOf = (lines: CartLine[], productId: number): number =>
  lines.find((l) => l.productId === productId)?.qty ?? 0;

/** Adds one, unless the line is already at the piece's limit (`stock`, see qtyLimit). */
export function addLine(lines: CartLine[], productId: number, stock?: number | null): CartLine[] {
  const limit = qtyLimit(stock);
  const existing = lines.find((l) => l.productId === productId);
  if (existing) {
    return existing.qty >= limit ? lines : lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
  }
  return lines.length >= MAX_LINES || limit < 1 ? lines : [...lines, { productId, qty: 1 }];
}

/** Takes one off the line, and drops the line when it reaches zero (the prototype's "Remove"). */
export function removeOne(lines: CartLine[], productId: number): CartLine[] {
  return lines.flatMap((l) => {
    if (l.productId !== productId) return [l];
    return l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : [];
  });
}

export const dropProducts = (lines: CartLine[], ids: number[]): CartLine[] =>
  lines.filter((l) => !ids.includes(l.productId));

export const countItems = (lines: CartLine[]): number => lines.reduce((n, l) => n + l.qty, 0);

// ---- the store ----
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function snapshot(): CartLine[] {
  if (cache === null) {
    try {
      cache = parseCart(window.localStorage.getItem(KEY));
    } catch {
      cache = EMPTY; // storage blocked: the cart still works for this page view
    }
  }
  return cache;
}

function commit(next: CartLine[]) {
  cache = next.length ? next : EMPTY;
  try {
    if (next.length) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage full or blocked: keep the in-memory cart
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== KEY) return;
    cache = null; // another tab changed the cart
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  /** True when a piece went in (false at the piece's limit or a full cart). */
  add: (productId: number, stock?: number | null): boolean => {
    const before = snapshot();
    const next = addLine(before, productId, stock);
    commit(next);
    return next !== before;
  },
  removeOne: (productId: number) => commit(removeOne(snapshot(), productId)),
  drop: (ids: number[]) => commit(dropProducts(snapshot(), ids)),
  clear: () => commit([]),
};

/** The cart lines. Empty during server rendering and hydration, then the stored cart. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
