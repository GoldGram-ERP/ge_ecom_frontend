import type { NextConfig } from "next";

// Where the NestJS backend listens. The browser never calls it directly: /api/* is proxied
// through this app, so requests are same-origin and the session cookie stays first-party.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Hosts that run the app as one self-contained server (Hostinger) need the standalone output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // Title, canonical and hreflang must be in <head> for every user agent, never streamed into <body> (TEC-06).
  htmlLimitedBots: /.*/,
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
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
