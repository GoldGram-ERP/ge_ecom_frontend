"use client";

import { useSyncExternalStore } from "react";
import type { Prices, Spot } from "./types";

// One server-sent-events connection for the whole tab: the price ticker, the home phones and
// anything else that shows live prices read from it. It opens with the first reader, closes
// with the last, and sleeps while the tab is hidden.
type Live = { prices: Prices | null; spot: Spot | null };

const EMPTY: Live = { prices: null, spot: null };
let state: Live = EMPTY;
let source: EventSource | null = null;
const readers = new Set<() => void>();

function update(next: Partial<Live>) {
  state = { ...state, ...next };
  for (const reader of readers) reader();
}

function open() {
  if (source || document.hidden) return;
  source = new EventSource("/api/prices/stream");
  source.addEventListener("board", (e) => update({ prices: JSON.parse((e as MessageEvent<string>).data) as Prices }));
  source.addEventListener("spot", (e) => update({ spot: JSON.parse((e as MessageEvent<string>).data) as Spot }));
}

function close() {
  source?.close();
  source = null;
}

const onVisibility = () => (document.hidden ? close() : open());

function subscribe(reader: () => void) {
  readers.add(reader);
  if (readers.size === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    open();
  }
  return () => {
    readers.delete(reader);
    if (readers.size === 0) {
      document.removeEventListener("visibilitychange", onVisibility);
      close();
    }
  };
}

/** The live board and ounce; `initial` (read on the server) shows until the stream's first event. */
export function useLivePrices(initial?: Partial<Live>): Live {
  const live = useSyncExternalStore(subscribe, () => state, () => EMPTY);
  return { prices: live.prices ?? initial?.prices ?? null, spot: live.spot ?? initial?.spot ?? null };
}
