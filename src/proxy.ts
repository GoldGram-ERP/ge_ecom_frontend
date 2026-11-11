import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { applyRedirect, canonicalQuery, type RedirectRule } from "@/lib/seo";

// Locale routing, redirect rules and the canonical query. Arabic is served at the root (no prefix);
// English lives under /en. The app's pages live in the internal [locale] tree, so root paths are
// rewritten to /ar. The path without its language goes on to the layout as x-gg-path, and the query
// without tracking parameters as x-gg-query (canonical, robots and pagination read them).
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

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname, search } = request.nextUrl;

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
  const headers = new Headers(request.headers);
  headers.set("x-gg-path", bare === "/" ? "" : bare);
  headers.set("x-gg-query", canonicalQuery(search));

  // English keeps its /en prefix; its paths already match the [locale] tree.
  if (isEn) return NextResponse.next({ request: { headers } });

  // Everything else is Arabic at the root: render it from the internal /ar tree.
  const url = request.nextUrl.clone();
  url.pathname = `/ar${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

// Everything except the API proxy, the dashboard's built-in wording feed, the revalidation hook,
// Next internals and files with an extension.
export const config = { matcher: ["/((?!api|site-texts|revalidate|_next|.*\\.).*)"] };
