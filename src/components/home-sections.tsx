import Image from "next/image";
import { localePath } from "@/i18n";
import Link from "next/link";
import type { Locale } from "@/i18n";
import type { Dict } from "@/i18n";
import { cairoDate } from "@/lib/format";
import type { Article, Product } from "@/lib/types";

/** Article bodies are HTML; this flattens one to plain text for a card excerpt. */
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const articleTitle = (a: Article, locale: Locale) => (locale === "ar" ? a.titleAr : a.titleEn);
export const articleBody = (a: Article, locale: Locale) => (locale === "ar" ? a.bodyAr : a.bodyEn);

/** A guide's address (PG-12): its slug, or its id on a backend that has no slugs yet. */
export const guidePath = (a: Article) => `/guides/${a.slug || a.id}`;

/** Featured pieces first, filled up to four with the rest of the catalogue in its own order. */
export function starterProducts(products: Product[]): Product[] {
  const featured = products.filter((p) => p.featured);
  return (featured.length >= 4 ? featured : [...featured, ...products.filter((p) => !p.featured)].slice(0, 4)).slice(0, 8);
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
          <Link className="art-card" key={a.id} href={localePath(locale, guidePath(a))}>
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
