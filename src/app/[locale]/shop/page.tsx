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

/** The heading for a filtered shop: by category (c) first, so "Gold coins" / "Gold ingots" show, then by metal/size. */
function selectionName(
  query: Record<string, string | string[] | undefined>,
  t: Awaited<ReturnType<typeof getTexts>>,
): string | null {
  const c = typeof query.c === "string" ? query.c : undefined;
  const { metal, size } = presetOf(query);
  if (metal === "silver") return t.nav.silver;
  if (c === "coin") return t.nav.coins;
  if (c === "wear") return t.nav.wearable;
  if (c === "bar") return size === "small" ? t.nav.ingots : size === "large" ? t.nav.bars : t.nav.bars;
  if (size === "small") return t.footer.smallGold;
  if (size === "large") return t.footer.largeGold;
  return null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/shop">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getTexts(locale);
  return { title: `${selectionName(await searchParams, t) ?? t.nav.shop} · GoldGram` };
}

export default async function ShopPage({ params, searchParams }: PageProps<"/[locale]/shop">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const t = await getTexts(locale);
  const query = await searchParams;
  const preset = presetOf(query);
  const selection = selectionName(query, t);
  // No catch: if the catalogue cannot be loaded, error.tsx offers a retry.
  const products = (await getProducts()).filter(
    (p) =>
      (!preset.metal || (preset.metal === "silver") === isSilver(p)) &&
      (!preset.size || (preset.size === "small") === isSmall(p.weightGrams)),
  );
  const initial = products.find((p) => p.category === query.c)?.category ?? "all";

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
