// Cloudflare Workers build of the storefront (OpenNext). Page caching, two layers:
// 1. Next.js ISR (pages revalidate every 60 s, see app/[locale]/layout.tsx) stored in Workers KV, with a per-colo
//    regional cache in front so most reads never reach KV;
// 2. cache interception: a cached page is served before the Next.js server code runs (no render, almost no CPU).
// Time-based revalidation runs in the background through the Durable Object queue.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(kvIncrementalCache, { mode: "long-lived" }),
  queue: doQueue,
  enableCacheInterception: true,
});
