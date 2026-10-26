import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header-client";
import { ShopGrid } from "@/components/ShopGrid";
import { hasLocale } from "@/i18n";
import { isSilver, isSmall } from "@/lib/kinds";
import { getTexts } from "@/lib/site-texts";
import { getProducts } from "@/lib/server-api";

// The footer's ready-made selections: metal (`m`) and size (`w`), by the rule the compare page uses too.
type Preset = { metal?: "gold" | "silver"; size?: "small" | "large" };

function presetOf(query: Record<string, string | string[] | undefined>): Preset {
  const metal = query.m === "gold" || query.m === "silver" ? query.m : undefined;
  const size = query.w === "small" || query.w === "large" ? query.w : undefined;
  return { metal, size };
}

/** The heading for a metal/size preset (silver, small/large gold). Category names come from the catalogue itself. */
function presetName(preset: Preset, t: Awaited<ReturnType<typeof getTexts>>): string | null {
  if (preset.metal === "silver") return t.nav.silver;
  if (preset.size === "small") return t.footer.smallGold;
  if (preset.size === "large") return t.footer.largeGold;
  return null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${presetName(presetOf(await searchParams), t) ?? t.nav.shop} · GoldGram` };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const query = await searchParams;
  const preset = presetOf(query);
  const c = typeof query.c === "string" ? query.c : undefined;
  // No catch: if the catalogue cannot be loaded, error.tsx offers a retry.
  const products = (await getProducts()).filter(
    (p) =>
      (!preset.metal || (preset.metal === "silver") === isSilver(p)) &&
      (!preset.size || (preset.size === "small") === isSmall(p.weightGrams)),
  );
  const category = c ? products.find((p) => p.category === c) : undefined;
  // The heading: the chosen category's own name (ingots, coins, ...) or the metal/size preset.
  const selection = category ? (locale === "ar" ? category.categoryNameAr : category.categoryNameEn) : presetName(preset, t);
  const initial = category?.category ?? "all";

  return (
    <div className="page buy-page">
      <SiteHeader />

      <div className="band-off">
        <div className="wrap">
          <section style={{ paddingTop: "var(--s8)" }}>
            {selection ? (
              <div className="shop-preset">
                <h1>{selection}</h1>
                <Link href={`/${locale}/shop`}>{t.shop.all}</Link>
              </div>
            ) : (
              <h1 className="vh">{t.nav.shop}</h1>
            )}
            <ShopGrid products={products} initial={initial} />

            <div className="assure">
              {t.shop.assure.map((item) => (
                <div className="as" key={item.t}>
                  <span>{item.t}</span>
                  <p>{item.d}</p>
                </div>
              ))}
            </div>

            <p className="buy-note">{t.shop.note}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
