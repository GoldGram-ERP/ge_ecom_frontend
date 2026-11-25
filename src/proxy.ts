import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { applyRedirect, canonicalQuery, isSiteQuery, localeSegment, PRIVATE, type RedirectRule } from "@/lib/seo";

// Locale routing, redirect rules and the canonical query. Arabic is served at the root (no prefix);
// English lives under /en. The app's pages live in the internal [locale] tree, so root paths are
// rewritten to /ar. Public pages are cached by their path (TEC-02), so a query that changes the page
// (a filter, ?page=N; never a tracking parameter) is rewritten into the language segment and is its
// own cached page. The pages rendered per request (account, checkout, sign-in...) get the path as
// x-gg-path and the canonical query as x-gg-query instead.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

// The dashboard's redirect rules (DSH-12), kept for a minute so a page view never waits on them.
// shortcut: per-server memory, so a new rule takes up to a minute to apply; fine for slug changes.
let rules: RedirectRule[] = [];
let rulesAt = 0;
let loading: Promise<void> | null = null;
const RULES_TTL = 60_000;

function loadRules(): Promise<void> {
  loading ??= fetch(`${API_URL}/api/seo/redirects`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(1500) })
    .then(async (response) => {
      if (response.ok) rules = ((await response.json()) as RedirectRule[]).filter((r) => r && typeof r.from === "string");
      else if (response.status === 404) rules = []; // backend without the redirect manager yet
    })
    .catch(() => {}) // backend down: keep the last rules
    .finally(() => {
      rulesAt = Date.now();
      loading = null;
    });
  return loading;
}

async function currentRules(): Promise<RedirectRule[]> {
  if (Date.now() - rulesAt > RULES_TTL) {
    // The first request waits for the list; later ones refresh it in the background.
    if (rulesAt === 0) await loadRules();
    else void loadRules();
  }
  return rules;
}

const GONE_HTML = (isEn: boolean) =>
  `<!doctype html><html lang="${isEn ? "en" : "ar-EG"}" dir="${isEn ? "ltr" : "rtl"}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>410</title></head><body><p>${
    isEn ? "This page has been removed." : "تمت إزالة هذه الصفحة."
  } <a href="${isEn ? "/en" : "/"}">${isEn ? "Home" : "الرئيسية"}</a></p></body></html>`;

// Calls to /api go on to the backend (next.config.ts rewrite), which would see this server's IP for
// every visitor. They carry the visitor's IP instead, vouched for by a secret only this server knows;
// whatever the browser sent in those two headers is dropped first. The staff API is not served here
// (the dashboard has its own address); the backend matches routes case-insensitively, hence /i.
function toApi(request: NextRequest) {
  if (/^\/api\/admin(\/|$)/i.test(request.nextUrl.pathname)) return new NextResponse(null, { status: 404 });
  // A visitor without a session cookie is a guest: answered here, so no signed-in call reaches the
  // backend and the browser logs no 401 on every page (TEC-02, PRF-03).
  if (request.method === "GET" && request.nextUrl.pathname === "/api/auth/me" && !request.cookies.has("gg_session")) {
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const headers = new Headers(request.headers);
  headers.delete("x-gg-client-ip");
  headers.delete("x-gg-proxy-key");
  // The backend has its own host name: never forward the storefront's Host (Cloudflare refuses a
  // request whose Host is another site, error 1003; Vercel used to overwrite it for us).
  headers.delete("host");
  const key = process.env.PROXY_SHARED_SECRET;
  // The visitor's IP: Cloudflare sets cf-connecting-ip; Vercel sets x-forwarded-for (first entry) and x-real-ip.
  const ip = request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip")?.trim();
  if (key && ip) {
    headers.set("x-gg-client-ip", ip);
    headers.set("x-gg-proxy-key", key);
  }
  return forward(request, headers, request.nextUrl.pathname);
}

// The backend call itself, made here rather than by a next.config rewrite: on Cloudflare Workers a
// rewrite re-sends the visitor's own Host and cf-* headers, which Cloudflare refuses for another
// zone (error 1003). Only end-to-end headers go out; redirects and Set-Cookie come back untouched.
const HOP = /^(host|connection|keep-alive|transfer-encoding|upgrade|te|trailer|proxy-.*|cf-.*|cdn-loop|x-forwarded-.*)$/i;
async function forward(request: NextRequest, incoming: Headers, path: string): Promise<Response> {
  const headers = new Headers();
  incoming.forEach((value, name) => { if (!HOP.test(name)) headers.set(name, value); });
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const target = new URL(path + request.nextUrl.search, API_URL);
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers, redirect: "manual" };
  if (hasBody) { init.body = request.body; init.duplex = "half"; }
  return fetch(target, init);
}

// Pictures at their public, slug-based address (MED-03) map to the backend's /api/images/*.
function toImages(request: NextRequest) {
  return forward(request, new Headers(request.headers), "/api/images" + request.nextUrl.pathname.slice("/images".length));
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, search } = request.nextUrl;
  // www is an alias: one permanent hop to the bare domain, path and query kept (Vercel did this at its edge).
  if (request.headers.get("host")?.toLowerCase() === "www.goldgram.eg") {
    return NextResponse.redirect(`https://goldgram.eg${pathname}${search}`, 308);
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) return toApi(request);
  if (pathname.startsWith("/images/")) return toImages(request);

  // Old Arabic URLs (/ar/...) are gone: Arabic is at the root now. Send them there, once.
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const isEn = pathname === "/en" || pathname.startsWith("/en/");

  // Redirect rules from the dashboard, before rendering, in one hop; 410 for pages gone for good.
  const hit = applyRedirect(await currentRules(), pathname, search);
  if (hit) {
    // Fire-and-forget hit counter (throttled by the backend); never delays the answer.
    event.waitUntil(
      fetch(`${API_URL}/api/seo/redirects/hit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: pathname }),
        signal: AbortSignal.timeout(2000),
      }).catch(() => {}),
    );
    if (hit.status === 410) {
      return new NextResponse(GONE_HTML(isEn), { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
    }
    return NextResponse.redirect(new URL(hit.location!, request.url), hit.status);
  }

  const bare = isEn ? pathname.slice(3) || "/" : pathname;

  // The silver shop filter has its own page now: /shop?m=silver (and nothing else) goes to /silver.
  const query = request.nextUrl.searchParams;
  if (bare === "/shop" && query.get("m") === "silver" && query.size === 1) {
    const url = request.nextUrl.clone();
    url.pathname = isEn ? "/en/silver" : "/silver";
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  const canonical = canonicalQuery(search);
  const headers = new Headers(request.headers);
  headers.set("x-gg-path", bare === "/" ? "" : bare);
  headers.set("x-gg-query", canonical);

  // The internal language segment: the language, plus the canonical query of a public page.
  // A query the site does not link to gets the clean page, kept out of the index by a header.
  const invented = !PRIVATE.test(bare) && canonical !== "" && !isSiteQuery(canonical);
  const segment = localeSegment(isEn ? "en" : "ar", PRIVATE.test(bare) || invented ? "" : canonical);
  const noindex = (response: NextResponse) => {
    if (invented) response.headers.set("X-Robots-Tag", "noindex, follow");
    return response;
  };

  // English keeps its /en prefix; its paths already match the [locale] tree.
  if (segment === "en") return noindex(NextResponse.next({ request: { headers } }));

  // Everything else is rendered from the internal tree: Arabic at the root from /ar, a query's own page from its segment.
  const url = request.nextUrl.clone();
  url.pathname = `/${segment}${bare === "/" ? "" : bare}`;
  return noindex(NextResponse.rewrite(url, { request: { headers } }));
}

// Pages: everything except the API proxy, the dashboard's built-in wording feed, the revalidation hook,
// Next internals and files with an extension. Then the API proxy itself, for toApi.
export const config = { matcher: ["/((?!api|site-texts|revalidate|_next|.*\\.).*)", "/api/:path*", "/images/:path*"] };
