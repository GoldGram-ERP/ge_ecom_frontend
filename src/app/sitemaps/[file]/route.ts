import { guidePath } from "@/components/home-sections";
import { isSilver } from "@/lib/kinds";
import { filterSitemap, sitemapXml, type SitemapEntry } from "@/lib/seo";
import { getSeoEntryFlags, getWeightList } from "@/lib/seo-data";
import { getArticles, getPricesOrNull, getProducts } from "@/lib/server-api";
import { CATEGORY_URLS, SILVER } from "@/lib/shop-links";
import type { Product } from "@/lib/types";

// One sitemap per kind of page (IDX-02): only public, indexable, self-canonical URLs. A page the
// dashboard switched to noindex or out of the sitemap is left out, and so is an empty category.
// lastmod is a real change: the last price publish for pages that show a price, a guide's date.

/** The static pages and their SEO entry keys (GET /seo/entries/static/:key). */
const STATIC: { key: string; path: string; priced?: boolean }[] = [
  { key: "home", path: "/", priced: true },
  { key: "gold-price-today", path: "/gold-price-today", priced: true },
  { key: "silver-price-today", path: "/silver-price-today", priced: true },
  { key: "shop", path: "/shop", priced: true },
  { key: "making-charges", path: "/making-charges", priced: true },
  { key: "zakat-calculator", path: "/zakat-calculator", priced: true },
  { key: "app", path: "/app", priced: true },
  { key: "faq", path: "/faq" },
  { key: "guides", path: "/guides" },
  { key: "about", path: "/about" },
  { key: "contact", path: "/contact" },
  { key: "policies-shipping", path: "/policies/shipping" },
  { key: "policies-buyback", path: "/policies/buyback" },
  { key: "terms", path: "/terms" },
  { key: "privacy", path: "/privacy" },
];

const products = () => getProducts().catch((): Product[] => []);

const builders: Record<string, () => Promise<SitemapEntry[]>> = {
  pages: async () => {
    const [all, prices, staticFlags, categoryFlags] = await Promise.all([products(), getPricesOrNull(), getSeoEntryFlags("static"), getSeoEntryFlags("category")]);
    const priced = prices?.updatedAt;
    // A category with nothing listed is noindex (IDX-05), so it stays out until it has products.
    const categories = Object.entries(CATEGORY_URLS)
      .filter(([, slugs]) => all.some((p) => (slugs[0] === SILVER ? isSilver(p) : slugs.includes(p.category))))
      .map(([url]) => ({ key: url, path: `/${url}`, lastModified: priced }));
    return [
      ...filterSitemap(STATIC.map((s) => ({ key: s.key, path: s.path, lastModified: s.priced ? priced : undefined })), staticFlags),
      ...filterSitemap(categories, categoryFlags),
    ];
  },
  weights: async () => {
    const [all, prices, flags] = await Promise.all([products(), getPricesOrNull(), getSeoEntryFlags("weight")]);
    const weights = await getWeightList(all);
    return filterSitemap(weights.map((w) => ({ key: w.slug, path: `/gold-bars/${w.slug}`, lastModified: prices?.updatedAt })), flags);
  },
  products: async () => {
    const [all, prices, flags] = await Promise.all([products(), getPricesOrNull(), getSeoEntryFlags("product")]);
    // Out-of-stock products stay in (IDX-02); their price still moves with each publish.
    return filterSitemap(all.map((p) => ({ key: p.slug, path: `/shop/${p.slug}`, lastModified: prices?.updatedAt })), flags);
  },
  brands: async () => {
    const [all, flags] = await Promise.all([products(), getSeoEntryFlags("brand")]);
    const slugs = [...new Set(all.map((p) => p.manufacturerSlug).filter(Boolean))];
    return [{ path: "/brands" }, ...filterSitemap(slugs.map((s) => ({ key: s, path: `/brands/${s}` })), flags)];
  },
  guides: async () => {
    const [articles, flags] = await Promise.all([getArticles().catch(() => []), getSeoEntryFlags("guide")]);
    return filterSitemap(articles.map((a) => ({ key: a.slug || String(a.id), path: guidePath(a), lastModified: a.publishedAt })), flags);
  },
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const build = file.endsWith(".xml") ? builders[file.slice(0, -4)] : undefined;
  if (!build) return new Response("Not found", { status: 404 });
  return new Response(sitemapXml(await build()), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
