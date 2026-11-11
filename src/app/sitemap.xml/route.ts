import { sitemapIndexXml } from "@/lib/seo";

export function GET() {
  return new Response(sitemapIndexXml(["pages", "products", "brands", "guides"]), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
