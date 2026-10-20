import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { karatLabel, pounds, weightLabel } from "@/lib/format";
import { getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import type { Product } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.compare.title} · GoldGram`, description: t.compare.sub };
}

/** One choice of the page: pieces of one category, karat and weight, from every maker. */
type Group = { key: string; products: Product[] };

function groupsOf(products: Product[]): Group[] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = `${p.category}-${p.karat}-${p.weightGrams}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const all = [...groups.entries()]
    .map(([key, list]) => ({ key, products: list.sort((a, b) => a.pricePiastres - b.pricePiastres) }))
    .sort((a, b) => a.products[0].weightGrams - b.products[0].weightGrams);
  // Only the weights several makers offer, when there are any: one maker alone compares nothing.
  const shared = all.filter((group) => group.products.length > 1);
  return shared.length > 0 ? shared : all;
}

export default async function ComparePage({ params, searchParams }: PageProps<"/[locale]/compare">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const { g } = await searchParams;
  const groups = groupsOf(await getProducts());
  const shown = groups.find((group) => group.key === g) ?? groups[0];
  const egp = (piastres: number) => (
    <>
      {pounds(piastres)} <small>{t.product.egp}</small>
    </>
  );
  const label = (p: Product) =>
    `${weightLabel(p.weightGrams, t)} · ${karatLabel(p.karat, t)} · ${locale === "ar" ? p.categoryNameAr : p.categoryNameEn}`;
  const lowestMaking = shown ? Math.min(...shown.products.map((p) => p.laborPiastres)) : 0;

  return (
    <div className="page buy-page">
      <SiteHeader />
      <div className="band-off">
        <div className="wrap cmp">
          <div className="cmp-head">
            <h1>{t.compare.title}</h1>
            <p>{t.compare.sub}</p>
          </div>

          {!shown ? (
            <p className="buy-empty">{t.compare.empty}</p>
          ) : (
            <>
              <nav className="cmp-pick" aria-label={t.compare.pick}>
                {groups.map((group) => (
                  <Link
                    key={group.key}
                    className={`fp${group === shown ? " on" : ""}`}
                    aria-current={group === shown ? "page" : undefined}
                    href={`/${locale}/compare?g=${group.key}`}
                    scroll={false}
                  >
                    {label(group.products[0])}
                  </Link>
                ))}
              </nav>

              <div className="pdp-table-wrap">
                <table className="pdp-table cmp-table">
                  <caption className="vh">{label(shown.products[0])}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.compare.maker}</th>
                      <th scope="col">{t.compare.price}</th>
                      <th scope="col">{t.compare.making}</th>
                      <th scope="col">{t.compare.cashback}</th>
                      <th scope="col">{t.compare.buybackWith}</th>
                      <th scope="col">{t.compare.buybackWithout}</th>
                      <th scope="col">
                        <span className="vh">{t.compare.view}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.products.map((p, index) => (
                      <tr key={p.id}>
                        <th scope="row">
                          {(locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || (locale === "ar" ? p.nameAr : p.nameEn)}
                          {index === 0 && shown.products.length > 1 ? <em className="pdp-tag">{t.compare.best}</em> : null}
                          {p.laborPiastres === lowestMaking && shown.products.length > 1 ? <em className="pdp-tag cmp-low">{t.compare.lowest}</em> : null}
                        </th>
                        <td>{egp(p.pricePiastres)}</td>
                        <td>{egp(p.laborPiastres)}</td>
                        <td>{p.buyback ? egp(p.buyback.laborPiastres) : <span className="cmp-ask">{t.compare.none}</span>}</td>
                        <td>{p.buyback ? egp(p.buyback.withPackagingPiastres) : <span className="cmp-ask">{t.compare.none}</span>}</td>
                        <td>{p.buyback ? egp(p.buyback.withoutPackagingPiastres) : <span className="cmp-ask">{t.compare.none}</span>}</td>
                        <td>
                          <Link className="pdp-view" href={`/${locale}/shop/${p.id}`}>
                            {t.compare.view}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="cmp-note">{t.compare.note}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
