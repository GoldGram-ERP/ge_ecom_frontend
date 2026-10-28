import Link from "next/link";
import { localePath } from "@/i18n";
import type { Locale } from "@/i18n";
import type { Dict } from "@/i18n";
import type { Product } from "@/lib/types";

/** One card per maker, with how many of its pieces are listed. */
export function BrandsStrip({ products, locale, t }: { products: Product[]; locale: Locale; t: Dict }) {
  const makers = new Map<number, { name: string; n: number }>();
  for (const p of products) {
    const name = locale === "ar" ? p.manufacturerAr : p.manufacturerEn;
    const m = makers.get(p.manufacturerId);
    if (m) m.n++;
    else if (name) makers.set(p.manufacturerId, { name, n: 1 });
  }
  if (!makers.size) return null;
  return (
    <div className="brands">
      {[...makers].map(([id, m]) => (
        <div className="brand-card" key={id}>
          <b>{m.name}</b>
          <span>{t.brands.pieces.replace("{n}", String(m.n))}</span>
        </div>
      ))}
    </div>
  );
}

export function HowToBuy({ t }: { t: Dict }) {
  return (
    <ol className="steps">
      {t.howToBuy.steps.map((s, i) => (
        <li className="step-card" key={s.t}>
          <i>{i + 1}</i>
          <h3>{s.t}</h3>
          <p>{s.d}</p>
        </li>
      ))}
    </ol>
  );
}

export function SellCta({ t, locale }: { t: Dict; locale: Locale }) {
  return (
    <div className="sell-cta">
      <h2 className="ask">{t.sellCta.title}</h2>
      <p>{t.sellCta.sub}</p>
      <Link className="btn btn-gold" href={localePath(locale, `/sell`)}>
        {t.sellCta.button}
      </Link>
    </div>
  );
}
