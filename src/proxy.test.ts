import { type NextFetchEvent, NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const call = (path: string, headers: Record<string, string> = {}) =>
  proxy(new NextRequest(`http://localhost${path}`, { headers }), {} as NextFetchEvent);

// What the backend receives: Next passes the request headers the proxy chose as x-middleware-request-*.
async function forwarded(headers: Record<string, string>) {
  const response = await call("/api/auth/login", headers);
  const kept = response.headers.get("x-middleware-override-headers")!.split(",");
  const sent = (name: string) => (kept.includes(name) ? response.headers.get(`x-middleware-request-${name}`) : null);
  return { ip: sent("x-gg-client-ip"), key: sent("x-gg-proxy-key"), cookie: sent("cookie") };
}

const forged = { "x-gg-client-ip": "6.6.6.6", "x-gg-proxy-key": "forged" };

describe("calls forwarded to the backend", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("carry the first x-forwarded-for entry and the shared key, never the browser's own", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
    expect(await forwarded({ ...forged, "x-forwarded-for": "203.0.113.7, 10.0.0.1", cookie: "gg_session=a" })).toEqual({ ip: "203.0.113.7", key: "s3cret", cookie: "gg_session=a" });
  });

  it("fall back to x-real-ip", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "s3cret");
    expect(await forwarded({ ...forged, "x-real-ip": "198.51.100.4" })).toMatchObject({ ip: "198.51.100.4", key: "s3cret" });
  });

  it("carry nothing extra without the secret, and still drop what the browser sent", async () => {
    vi.stubEnv("PROXY_SHARED_SECRET", "");
    expect(await forwarded({ ...forged, "x-forwarded-for": "203.0.113.7" })).toMatchObject({ ip: null, key: null });
  });

  it("never include the staff API, in any letter case", async () => {
    for (const path of ["/api/admin", "/api/admin/orders", "/api/Admin/auth/login", "/api/ADMIN/"]) {
      expect((await call(path)).status, path).toBe(404);
    }
    for (const path of ["/api/administrator", "/api/products/1/images/2"]) {
      expect((await call(path)).status, path).toBe(200);
    }
  });
});
