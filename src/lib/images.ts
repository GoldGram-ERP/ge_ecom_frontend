// Picture addresses (MED-02, MED-03). A picture is public at /images/<kind>/<slug>-<picture id>.<ext>,
// which next.config.ts sends on to the backend. The id changes with the picture, so the address is
// kept for a year; next/image resizes it and serves AVIF or WebP.

type WithPictures = { id: number; imageIds: number[]; imageFiles?: string[] };

/** The file name the backend gave this picture; absent on a backend older than MED-03. */
const fileOf = (owner: WithPictures, imageId: number) => owner.imageFiles?.[owner.imageIds.indexOf(imageId)];

/** A product photo: `/images/products/gold-era-10g-bar-24k-18.png`, or the old id address on an older backend. */
export function productImage(product: WithPictures, imageId: number): string {
  const file = fileOf(product, imageId);
  return file ? `/images/products/${file}` : `/api/products/${product.id}/images/${imageId}`;
}

/** An article picture: `/images/articles/<slug>-<id>.jpg`, or the old id address on an older backend. */
export function articleImage(article: WithPictures, imageId: number): string {
  const file = fileOf(article, imageId);
  return file ? `/images/articles/${file}` : `/api/articles/${article.id}/images/${imageId}`;
}

/** Wider than the page, so a body picture keeps the size it has today; a width next/image serves. */
const BODY_WIDTH = 1920;

/**
 * A guide's HTML with its own pictures (saved as `/api/articles/<id>/images/<n>`) served from their
 * public address through the image optimiser (AVIF or WebP). The first one is the page's main
 * image, loaded first; the rest load when scrolled to. A picture of another article, or one the
 * backend did not list, is left as written.
 * shortcut: one width and no width/height (the editor does not store them); add srcset when it does.
 */
export function articleBodyHtml(html: string, article: WithPictures): string {
  let found = 0;
  return html.replace(/<img\b([^>]*?)\ssrc="\/api\/articles\/(\d+)\/images\/(\d+)"/g, (whole, before: string, id: string, imageId: string) => {
    if (Number(id) !== article.id || !fileOf(article, Number(imageId))) return whole;
    const src = `/_next/image?url=${encodeURIComponent(articleImage(article, Number(imageId)))}&amp;w=${BODY_WIDTH}&amp;q=75`;
    const load = found++ === 0 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    return `<img${before} ${load} decoding="async" src="${src}"`;
  });
}
