"use client";

import { useState } from "react";
import { useI18n } from "./Providers";
import { Button } from "./controls";

// A small line icon per reason, in the order of t.why.panels (start small, know the price,
// collect/deliver, sell back). Simple 24×24 stroke paths so they read at a small size.
const WHY_ICONS = [
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 12V3 A9 9 0 0 1 21 12 Z",
  "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z M7 7h.01",
  "M3 9 4 4h16l1 5 M4 9v11h16V9 M9 20v-6h6v6",
  "M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5",
];

/** "Why buy gold with GoldGram?": four cards, all shown at once, one background, a small icon each. */
export function WhyPanels() {
  const { t } = useI18n();
  return (
    <>
      <div className="why-row">
        {t.why.panels.map((panel, i) => (
          <div className="panel" key={panel.t}>
            <span className="why-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={WHY_ICONS[i % WHY_ICONS.length]} />
              </svg>
            </span>
            <h3>{panel.t}</h3>
            <p>{panel.d}</p>
          </div>
        ))}
      </div>
      <div className="why-features">
        {t.why.features.map((f) => (
          <div key={f.t}>
            <b>{f.t}</b>
            <span>{f.d}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** The five questions on the home page, or another list of questions (`items`, with its own `id` prefix). */
export function FaqList({ items: given, id = "faq" }: { items?: readonly { q: string; a: string }[]; id?: string }) {
  const { t } = useI18n();
  const items = given ?? t.faq.items;
  const [open, setOpen] = useState<boolean[]>([]);

  return (
    <div className="qa">
      {items.map((item, i) => (
        <div className={`q${open[i] ? " open" : ""}`} key={item.q}>
          <Button
            type="button"
            aria-expanded={Boolean(open[i])}
            aria-controls={`${id}-${i}`}
            onClick={() => setOpen((state) => items.map((_, n) => (n === i ? !state[n] : Boolean(state[n]))))}
          >
            {item.q}
          </Button>
          <div className="a" id={`${id}-${i}`}>
            <p>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
