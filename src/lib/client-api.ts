import type { Dict } from "@/i18n";
import type { ApiErrorBody } from "./types";

// Browser-side calls. `/api/*` is rewritten to the backend by next.config.ts, so these are
// same-origin requests and the session cookie travels without any CORS setup.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Options {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: "no-store",
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "NETWORK", "Network request failed");
  }

  if (response.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // a proxy error page or an empty body
  }
  if (!response.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>;
    // A 5xx without our error shape means the backend itself is not answering.
    const code = body.code ?? (response.status >= 500 ? "NETWORK" : "UNKNOWN");
    throw new ApiError(response.status, code, body.message ?? response.statusText, body.details);
  }
  return data as T;
}

/** The message to show for an error no screen handles specifically. */
export function errorText(error: unknown, t: Dict): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK") return t.errors.network;
    if (error.code === "RATE_LIMITED" || error.status === 429) return t.errors.rate;
  }
  return t.errors.generic;
}

/** sessionStorage key: the token of the guest order this tab just placed, for the sign-up that may follow. */
export const CLAIM_KEY = "gg_claim";
