import { describe, expect, it } from "vitest";
import { articleBodyHtml, articleImage, productImage } from "./images";
import { filterSitemap, robotsTxt, sitemapXml } from "./seo";

const bar = { id: 6, imageIds: [18, 21], imageFiles: ["gold-era-10g-bar-24k-18.png", "gold-era-10g-bar-24k-21.jpg"] };
const guide = { id: 3, imageIds: [4, 5], imageFiles: ["gold-and-silver-4.jpg", "gold-and-silver-5.png"] };

describe("picture addresses (MED-03)", () => {
  it("a product photo is public under /images/products, by the file name of that photo", () => {
    expect(productImage(bar, 18)).toBe("/images/products/gold-era-10g-bar-24k-18.png");
    expect(productImage(bar, 21)).toBe("/images/products/gold-era-10g-bar-24k-21.jpg");
  });

  it("an article picture is public under /images/articles", () => {
    expect(articleImage(guide, 5)).toBe("/images/articles/gold-and-silver-5.png");
  });

  it("keeps the old id address when the backend lists no file name (older backend, cached answer)", () => {
    expect(productImage({ id: 6, imageIds: [18] }, 18)).toBe("/api/products/6/images/18");
    expect(articleImage({ id: 3, imageIds: [4] }, 4)).toBe("/api/articles/3/images/4");
    // A photo the product does not list never borrows another photo's name.
    expect(productImage(bar, 99)).toBe("/api/products/6/images/99");
  });
});

describe("pictures inside a guide's text (MED-02)", () => {
  const body = '<p>a</p><img src="/api/articles/3/images/4" /><p>b</p><img alt="x" src="/api/articles/3/images/5">';

  it("serves them from the public address through the optimiser, the first one first", () => {
    expect(articleBodyHtml(body, guide)).toBe(
      '<p>a</p><img loading="eager" fetchpriority="high" decoding="async" src="/_next/image?url=%2Fimages%2Farticles%2Fgold-and-silver-4.jpg&amp;w=1920&amp;q=75" /><p>b</p>' +
        '<img alt="x" loading="lazy" decoding="async" src="/_next/image?url=%2Fimages%2Farticles%2Fgold-and-silver-5.png&amp;w=1920&amp;q=75">',
    );
  });

  it("leaves a picture it cannot name as written", () => {
    const other = '<img src="/api/articles/9/images/4" /><img src="/api/articles/3/images/77" /><img src="https://example.com/a.png" />';
    expect(articleBodyHtml(other, guide)).toBe(other);
    expect(articleBodyHtml(body, { id: 3, imageIds: [4, 5] })).toBe(body);
  });
});

describe("sitemap and robots.txt after the move", () => {
  it("lists a product's pictures as image:image under both languages", () => {
    const xml = sitemapXml([{ path: "/shop/bar", images: ["https://goldgram.eg/images/products/a&b-18.png"] }]);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml.match(/<image:image><image:loc>https:\/\/goldgram\.eg\/images\/products\/a&amp;b-18\.png<\/image:loc><\/image:image><\/url>/g)).toHaveLength(2);
    expect(sitemapXml([{ path: "/faq" }])).not.toContain("<image:image>");
    // The pictures survive the noindex / out-of-sitemap filter the product list goes through.
    expect(filterSitemap([{ key: "bar", path: "/shop/bar", images: ["u"] }, { key: "faq", path: "/faq" }], [])).toEqual([{ path: "/shop/bar", images: ["u"] }, { path: "/faq" }]);
  });

  it("the default robots.txt needs no Allow line: pictures are outside /api/", () => {
    expect(robotsTxt()).toBe("User-agent: *\nDisallow: /api/\n\nSitemap: https://goldgram.eg/sitemap.xml\n");
    // A text saved in the dashboard is served as saved, old Allow lines included.
    const saved = "User-agent: *\nDisallow: /api/\nAllow: /api/products/*/images/\n\nSitemap: https://goldgram.eg/sitemap.xml";
    expect(robotsTxt(saved)).toBe(`${saved}\n`);
  });
});
