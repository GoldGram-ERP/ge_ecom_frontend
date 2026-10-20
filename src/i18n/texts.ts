import type { Dict } from "./en";

// The dictionary as a flat list, and back: what the dashboard's "Website texts" screen edits.
// A key is the text's path in the dictionary, e.g. "checkout.doneSteps.0".

/** Every string of a dictionary, by its path. */
export function flatten(value: unknown, path = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof value === "string") out[path] = value;
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) flatten(child, path ? `${path}.${key}` : key, out);
  }
  return out;
}

/**
 * A copy of `dict` with the rewritten texts in place. Only a path that already holds a string is
 * replaced, so a stale or mistyped key changes nothing and the shape of the dictionary stays.
 */
export function withOverrides(dict: Dict, overrides: Record<string, string | null | undefined>): Dict {
  const copy = structuredClone(dict);
  for (const [key, text] of Object.entries(overrides)) {
    if (!text) continue;
    const parts = key.split(".");
    const last = parts.pop()!;
    let node: unknown = copy;
    for (const part of parts) node = node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined;
    if (node && typeof node === "object" && typeof (node as Record<string, unknown>)[last] === "string") {
      (node as Record<string, unknown>)[last] = text;
    }
  }
  return copy;
}
