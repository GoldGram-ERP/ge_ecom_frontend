import type { NextConfig } from "next";

// Where the NestJS backend listens. The browser never calls it directly: /api/* is proxied
// through this app, so requests are same-origin and the session cookie stays first-party.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Hosts that run the app as one self-contained server (Hostinger) need the standalone output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
