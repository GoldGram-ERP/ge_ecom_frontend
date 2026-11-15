import { type NextFetchEvent, NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readLocaleSegment } from "./lib/seo";
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

describe("the session check of a guest", () => {
  it("is answered here as a guest, without asking the backend and without an error", async () => {
    const response = await call("/api/auth/me");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-middleware-next")).toBeNull();
  });

  it("goes to the backend once there is a session cookie, and for every other call", async () => {
    expect((await call("/api/auth/me", { cookie: "gg_session=a" })).headers.get("x-middleware-next")).toBe("1");
    expect((await call("/api/orders/mine")).headers.get("x-middleware-next")).toBe("1");
    const post = await proxy(new NextRequest("http://localhost/api/auth/me", { method: "POST" }), {} as NextFetchEvent);
    expect(post.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("pages are cached by their path (TEC-02)", () => {
  // Where the page is rendered from: the internal path of the rewrite, null when the address is kept.
  const rendered = async (path: string) => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("no backend in tests")));
    const response = await call(path);
    vi.unstubAllGlobals();
    const to = response.headers.get("x-middleware-rewrite");
    return { to: to ? new URL(to).pathname : null, query: response.headers.get("x-middleware-request-x-gg-query") };
  };

  it("a clean address, with or without tracking parameters, is one shared page", async () => {
    expect((await rendered("/gold-bars")).to).toBe("/ar/gold-bars");
    expect((await rendered("/gold-bars?utm_source=news&gclid=1")).to).toBe("/ar/gold-bars");
    expect((await rendered("/")).to).toBe("/ar");
    expect((await rendered("/en/faq?fbclid=x&page=1")).to).toBeNull();
  });

  it("a filter or a page number is its own page, told apart by the language segment", async () => {
    const page2 = await rendered("/en/guides?utm_source=x&page=2");
    expect(page2.to).toMatch(/^\/en~[A-Za-z0-9_-]+\/guides$/);
    expect(readLocaleSegment(page2.to!.split("/")[1])).toEqual({ locale: "en", query: "page=2" });
    const shop = await rendered("/shop?w=small&m=gold");
    expect(readLocaleSegment(shop.to!.split("/")[1])).toEqual({ locale: "ar", query: "m=gold&w=small" });
    expect(readLocaleSegment((await rendered("/?x=1")).to!.slice(1))).toEqual({ locale: "ar", query: "x=1" });
  });

  it("a private page is never a cached copy: its query stays in the request", async () => {
    expect(await rendered("/sign-up?next=checkout&email=a%40b.co")).toEqual({ to: "/ar/sign-up", query: "email=a%40b.co&next=checkout" });
    expect(await rendered("/en/reset-password?token=abc")).toEqual({ to: null, query: "token=abc" });
    expect((await rendered("/account?tab=profile")).to).toBe("/ar/account");
  });

  it("an internal segment cannot be asked for from outside", async () => {
    expect((await rendered("/en~cGFnZT0y/guides")).to).toBe("/ar/en~cGFnZT0y/guides");
  });
});
