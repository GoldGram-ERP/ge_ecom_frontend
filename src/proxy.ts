import { type NextRequest, NextResponse } from "next/server";

// Search engines: pages that belong to one visitor (account, orders, checkout, sign-in) and any
// URL with a query (shop filter combinations, help search results) are kept out of the index;
// their links are still followed. The path without its language goes on to the layout, which
// names the page's English and Arabic versions from it.
const PRIVATE = /^\/(en|ar)\/(account|checkout|sign-in|sign-up|forgot-password|reset-password)(\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set("x-gg-path", pathname.replace(/^\/(en|ar)/, ""));
  const response = NextResponse.next({ request: { headers } });
  if (PRIVATE.test(pathname) || search) response.headers.set("X-Robots-Tag", "noindex, follow");
  return response;
}

export const config = { matcher: ["/(en|ar)", "/(en|ar)/:path*"] };
