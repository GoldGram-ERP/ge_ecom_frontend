import { sitemapXml, type SitemapEntry } from "@/lib/seo";
import { getArticles, getProducts } from "@/lib/server-api";

// One sitemap per kind of page (IDX-02). Only public, indexable, self-canonical URLs; never the
// private pages. lastmod is only given where the data has a real date (articles).
const builders: Record<string, () => Promise<SitemapEntry[]>> = {
  pages: async () => {
    const categories = new Set((await getProducts().catch(() => [])).map((p) => p.category));
    const kinds = { bar: "/gold-bars", coin: "/gold-coins", ingot: "/gold-ingots", wear: "/gold-bar-pendants" };
    return [
      "/", "/prices", "/prices/silver", "/shop", "/making-charges", "/compare", "/zakat", "/help", "/articles", "/terms", "/privacy",
      ...Object.entries(kinds).filter(([c]) => categories.has(c)).map(([, path]) => path),
    ].map((path) => ({ path }));
  },
  products: async () => (await getProducts().catch(() => [])).map((p) => ({ path: `/shop/${p.slug}` })),
  brands: async () => {
    const slugs = new Set((await getProducts().catch(() => [])).map((p) => p.manufacturerSlug).filter(Boolean));
    return ["/brands", ...[...slugs].map((s) => `/brands/${s}`)].map((path) => ({ path }));
  },
  guides: async () => (await getArticles().catch(() => [])).map((a) => ({ path: `/articles/${a.id}`, lastModified: a.publishedAt })),
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const build = file.endsWith(".xml") ? builders[file.slice(0, -4)] : undefined;
  if (!build) return new Response("Not found", { status: 404 });
  return new Response(sitemapXml(await build()), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
