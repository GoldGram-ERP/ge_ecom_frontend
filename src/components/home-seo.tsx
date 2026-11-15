import Link from "next/link";
import { type Dict, fmt, type Locale, localePath } from "@/i18n";
import { pounds } from "@/lib/format";
import { type BrandComparison, goldForms } from "@/lib/home-rules";
import type { Weight } from "@/lib/seo-data";
import { SHOP_LINKS } from "@/lib/shop-links";
import type { Product } from "@/lib/types";
import { StoreButtons } from "./chrome";

// The home page's sections the SEO requirements add (PG-01). Server-rendered, in the classes the
// site already has: the weight tiles of /gold-bars, the guide cards, the weight page's table.

/** Shop by weight: one tile per bar weight on sale, with its lowest price, linking to its page. */
export function HomeWeights({ weights, bars, locale, t }: { weights: Weight[]; bars: Product[]; locale: Locale; t: Dict }) {
  return (
    <div className="brands weight-tiles">
      {weights.map((w) => {
        const from = Math.min(...bars.filter((p) => p.weightGrams === w.grams).map((p) => p.pricePiastres));
        return (
          <Link className="brand-card" key={w.slug} href={localePath(locale, `/gold-bars/${w.slug}`)}>
            <b>{w.label[locale]}</b>
            <span>{Number.isFinite(from) ? `${t.weight.from} ${pounds(from)} ${t.product.egp}` : fmt(t.brands.pieces, { n: w.productCount })}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** One gram, three forms: bars, coins and bars to wear, the last only when the shop has one. */
export function GoldForms({ products, locale, t }: { products: Product[]; locale: Locale; t: Dict }) {
  const forms = goldForms(products);
  return (
    <div className={`art-grid${forms.length === 2 ? " two" : ""}`}>
      {forms.map((form) => {
        return (
          <Link className="art-card" key={form} href={localePath(locale, SHOP_LINKS.find((l) => l.label === form)!.path)}>
            <h3>{t.nav[form]}</h3>
            <p>{t.home.forms[form]}</p>
            <span className="art-more">{t.home.formsShop}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** Same weight, different brands: each shared weight against each brand's price. */
export function BrandCompare({ table, locale, t }: { table: BrandComparison; locale: Locale; t: Dict }) {
  return (
    <>
      <p style={{ margin: "var(--s3) 0 var(--s4)", color: "var(--muted)", maxWidth: "62ch" }}>{t.home.compareText}</p>
      <div className="pdp-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th scope="col">{t.home.compareWeight}</th>
              {table.brands.map((b) => (
                <th scope="col" key={b.id}>
                  {b.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.slug}>
                <th scope="row">
                  <Link className="pr-row-link" href={localePath(locale, `/gold-bars/${row.slug}`)}>
                    {row.label}
                  </Link>
                </th>
                {row.prices.map((price, i) => (
                  <td key={table.brands[i].id}>{price === null ? "—" : pounds(price)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="pr-note">{t.home.compareNote}</p>
    </>
  );
}

/** Proofs: what comes with every piece, in the cards of "Why buy". */
export function Proofs({ t }: { t: Dict }) {
  return (
    <div className="why-row">
      {t.home.proofs.map((proof) => (
        <div className="panel" key={proof.t}>
          <h3>{proof.t}</h3>
          <p>{proof.d}</p>
        </div>
      ))}
    </div>
  );
}

/** The app band: what the app does, the store badges once their links are set, and the app page. */
export function AppBand({ locale, t }: { locale: Locale; t: Dict }) {
  return (
    <div className="sell-cta">
      <h2 className="ask">{t.home.appTitle}</h2>
      <p>{t.pages.appText}</p>
      <StoreButtons t={t} placement="home" />
      <Link className="btn btn-ghost" href={localePath(locale, "/app")}>
        {t.home.appMore}
      </Link>
    </div>
  );
}
