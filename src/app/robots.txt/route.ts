import { robotsTxt } from "@/lib/seo";
import { getSeoSite } from "@/lib/seo-data";

// The dashboard's robots.txt (DSH-11), or today's default when it is not set or the backend is down.
export async function GET() {
  const saved = (await getSeoSite())?.robotsTxt;
  return new Response(robotsTxt(saved), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
