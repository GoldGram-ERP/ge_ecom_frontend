import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { hasLocale } from "@/i18n";
import { poundsParts, productName, weightLabel } from "@/lib/format";
import { getProducts } from "@/lib/server-api";
import { getTexts } from "@/lib/site-texts";
import type { Product } from "@/lib/types";

// The making charge to the piastre, the way the product page shows it.
const money = (piastres: number) => poundsParts(piastres).full;

export async function generateMetadata({ params }: PageProps<"/[locale]/making-charges">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${t.making.title} · GoldGram` };
}

export default async function MakingChargesPage({ params }: PageProps<"/[locale]/making-charges">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  // No catch: if the catalogue cannot be loaded, error.tsx offers a retry.
  const products = await getProducts();

  // Grouped by category, in the catalogue's own order; each group shows its own name and its pieces.
  const groups = new Map<string, { name: string; items: Product[] }>();
  for (const p of products) {
    const name = locale === "ar" ? p.categoryNameAr : p.categoryNameEn;
    const group = groups.get(p.category) ?? { name, items: [] };
    group.items.push(p);
    groups.set(p.category, group);
  }

  return (
    <div className="page">
      <SiteHeader />

      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            <div className="kicker">{t.making.kicker}</div>
            <h1>{t.making.title}</h1>
            <p className="buy-note" style={{ maxWidth: "70ch", marginTop: "var(--s2)" }}>{t.making.intro}</p>

            {groups.size === 0 ? (
              <p className="buy-note">{t.making.empty}</p>
            ) : (
              [...groups.values()].map((group) => (
                <section className="pdp-section" key={group.name}>
                  <h2>{group.name}</h2>
                  <div className="pdp-table-wrap">
                    <table className="pdp-table">
                      <thead>
                        <tr>
                          <th scope="col">{t.making.colProduct}</th>
                          <th scope="col">{t.making.colWeight}</th>
                          <th scope="col">{t.making.colBrand}</th>
                          <th scope="col">{t.making.colMaking}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((p) => (
                          <tr key={p.id}>
                            <th scope="row">{productName(p, locale)}</th>
                            <td>{weightLabel(p.weightGrams, t)}</td>
                            <td>{(locale === "ar" ? p.manufacturerAr : p.manufacturerEn) || "—"}</td>
                            <td>
                              {money(p.laborPiastres)} <small>{t.product.egp}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}

            <p className="buy-note" style={{ marginTop: "var(--s6)" }}>{t.making.note}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
