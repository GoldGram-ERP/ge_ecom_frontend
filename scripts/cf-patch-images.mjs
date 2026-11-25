// After `opennextjs-cloudflare build`: product pictures live on the backend (/images/* is proxied to
// API_URL/api/images/*), not in the static assets, so the image optimizer must fetch them from there.
// OpenNext fetches every relative source from env.ASSETS; this patch sends /images/* to the backend.
import { readFileSync, writeFileSync } from "node:fs";

const file = ".open-next/cloudflare/images.js";
const before = "imageResponse = await env.ASSETS.fetch(absoluteURL);";
const after =
  'imageResponse = parseResult.url.startsWith("/images/") ? await fetch(new URL("/api/images" + parseResult.url.slice("/images".length), env.API_URL)) : await env.ASSETS.fetch(absoluteURL);';
const source = readFileSync(file, "utf8");
const count = source.split(before).length - 1;
if (count === 0) throw new Error(`cf-patch-images: pattern not found in ${file} (OpenNext changed?)`);
// Cloudflare's AVIF/WebP encoder is much harsher than sharp (what Next uses on Vercel) at the same
// number: q=75 turned the gold product shots soft. Floor the output quality at 90.
const qBefore = "quality: parseResult.quality,";
const qAfter = "quality: Math.max(parseResult.quality, 90),";
const qCount = source.split(qBefore).length - 1;
if (qCount === 0) throw new Error(`cf-patch-images: quality pattern not found in ${file} (OpenNext changed?)`);
writeFileSync(file, source.replaceAll(before, after).replaceAll(qBefore, qAfter));
console.log(`cf-patch-images: patched ${count} source fetch(es) and ${qCount} quality setting(s) in ${file}`);
