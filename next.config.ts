import type { NextConfig } from "next";

// Where the NestJS backend listens. The browser never calls it directly: /api/* is proxied
// through this app, so requests are same-origin and the session cookie stays first-party.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Hosts that run the app as one self-contained server (Hostinger) need the standalone output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // Cached pages answer `s-maxage=60, stale-while-revalidate=300` (TEC-02): a CDN may serve a page
  // for a minute, and a stale copy for five more while it fetches the new one, never longer.
  expireTime: 360,
  // Title, canonical and hreflang must be in <head> for every user agent, never streamed into <body> (TEC-06).
  htmlLimitedBots: /.*/,
  // Pictures (MED-02): AVIF first, WebP for browsers without it. Only our own picture paths may be
  // resized: /images/* (and the old /api addresses an older backend still lists), the logo and
  // files imported in code; anything else under /_next/image is refused.
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/api/products/*/images/*", search: "" },
      { pathname: "/api/articles/*/images/*", search: "" },
      { pathname: "/logo.png", search: "" },
      { pathname: "/_next/static/media/**", search: "" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Only directives that cannot break the marketing tags the SEO team adds in the
          // site-wide head code: no plugins, no <base> hijack, forms post only here, no framing by
          // other sites, and any stray http:// asset is fetched over HTTPS.
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests",
          },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
  // Arabic is served at the root and English under /en; middleware.ts handles the routing.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      // Pictures at their public, slug-based address (MED-03); the backend sets the year-long cache.
      { source: "/images/:path*", destination: `${API_URL}/api/images/:path*` },
    ];
  },
};

export default nextConfig;
