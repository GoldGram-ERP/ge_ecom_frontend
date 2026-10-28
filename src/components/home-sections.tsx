import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n";
import type { Dict } from "@/i18n";
import { artClass, artStyle, cairoDate, pounds, productName, productSub } from "@/lib/format";
import type { Article, Product } from "@/lib/types";
import { CarouselScroller } from "./carousel-scroller";
import { AddButton } from "./ShopGrid";

/** Article bodies are HTML; this flattens one to plain text for a card excerpt. */
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const articleTitle = (a: Article, locale: Locale) => (locale === "ar" ? a.titleAr : a.titleEn);
export const articleBody = (a: Article, locale: Locale) => (locale === "ar" ? a.bodyAr : a.bodyEn);

/** Featured pieces first, filled up to four with the rest of the catalogue in its own order. */
export function starterProducts(products: Product[]): Product[] {
  const featured = products.filter((p) => p.featured);
  return (featured.length >= 4 ? featured : [...featured, ...products.filter((p) => !p.featured)].slice(0, 4)).slice(0, 8);
}

/** Horizontal scroll-snap row of the shop's product cards. */
export function StarterCarousel({ products, locale, t }: { products: Product[]; locale: Locale; t: Dict }) {
  return (
    <CarouselScroller label={t.starter.title} locale={locale}>
      {products.map((p) => {
        const photo = p.imageIds?.[0];
        return (
          <article className="pcard" key={p.id}>
            <Link className="pc-link" href={`/${locale}/shop/${p.slug}`}>
              {photo ? (
                <div className="pc-frame">
                  <Image unoptimized className="pc-photo" src={`/api/products/${p.id}/images/${photo}`} alt="" width={328} height={328} loading="lazy" />
                </div>
              ) : (
                <div className="niche">
                  <div className="stand" />
                  <div className="obj">
                    <div className={artClass(p.category)} style={artStyle(p.category, 0)} />
                  </div>
                </div>
              )}
              <div className="pc-name">{productName(p, locale)}</div>
              <div className="pc-sub">{productSub(p, t)}</div>
            </Link>
            <div className="pc-price">
              {pounds(p.pricePiastres)}
              <u>{t.product.egp}</u>
            </div>
            <AddButton productId={p.id} inStock={p.inStock !== false} />
          </article>
        );
      })}
    </CarouselScroller>
  );
}

/** The article body is plain text: one paragraph per blank-line block, never HTML. */
export const paragraphs = (body: string) => body.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);

export function ArticleCards({ articles, locale, t }: { articles: Article[]; locale: Locale; t: Dict }) {
  return (
    <div className="art-grid">
      {articles.map((a) => {
        const first = stripHtml(articleBody(a, locale));
        const photo = a.imageIds?.[0];
        return (
          <Link className="art-card" key={a.id} href={`/${locale}/articles/${a.id}`}>
            {photo ? (
              <Image unoptimized className="art-img" src={`/api/articles/${a.id}/images/${photo}`} alt="" width={400} height={225} loading="lazy" />
            ) : null}
            <time dateTime={a.publishedAt}>{cairoDate(a.publishedAt, locale)}</time>
            <h3>{articleTitle(a, locale)}</h3>
            <p>{first.length > 140 ? `${first.slice(0, 140).trimEnd()}…` : first}</p>
            <span className="art-more">{t.articles.read}</span>
          </Link>
        );
      })}
    </div>
  );
}
