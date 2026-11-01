import { type NextRequest, NextResponse } from "next/server";
import { MOVED_URLS } from "@/lib/shop-links";

// Locale routing + indexing. Arabic is served at the root (no prefix); English lives under /en.
// The app's pages live in the internal [locale] tree, so root paths are rewritten to /ar.
// Private pages (account, checkout, sign-in…) and any URL with a query are kept out of the index;
// their links are still followed. The path without its language goes on to the layout as x-gg-path.
const PRIVATE = /^\/(account|checkout|sign-in|sign-up|forgot-password|reset-password)(\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Old Arabic URLs (/ar/...) are gone: Arabic is at the root now. Send them there, once.
  if (pathname === "/ar" || pathname.startsWith("/ar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const isEn = pathname === "/en" || pathname.startsWith("/en/");
  const bare = isEn ? pathname.slice(3) || "/" : pathname;

  // A page that moved (e.g. /gold-bar-pendants → /pendants) goes to its new address, for good.
  const moved = MOVED_URLS[bare.slice(1)];
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = isEn ? `/en/${moved}` : `/${moved}`;
    return NextResponse.redirect(url, 308);
  }

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

  const noindex = PRIVATE.test(bare) || Boolean(search);
  const withRobots = (response: NextResponse) => {
    if (noindex) response.headers.set("X-Robots-Tag", "noindex, follow");
    return response;
  };

  // English keeps its /en prefix; its paths already match the [locale] tree.
  if (isEn) return withRobots(NextResponse.next({ request: { headers } }));

  // Everything else is Arabic at the root: render it from the internal /ar tree.
  const url = request.nextUrl.clone();
  url.pathname = `/ar${pathname === "/" ? "" : pathname}`;
  return withRobots(NextResponse.rewrite(url, { request: { headers } }));
}

// Everything except the API proxy, the dashboard's built-in wording feed, Next internals and files with an extension.
export const config = { matcher: ["/((?!api|site-texts|_next|.*\\.).*)"] };
