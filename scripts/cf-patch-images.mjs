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
writeFileSync(file, source.replaceAll(before, after));
console.log(`cf-patch-images: patched ${count} place(s) in ${file}`);
