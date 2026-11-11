import { sitemapIndexXml } from "@/lib/seo";

// The sitemap index (IDX-02): pages, weights, products, brands and guides.
export function GET() {
  return new Response(sitemapIndexXml(["pages", "weights", "products", "brands", "guides"]), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
