"use client";

import { useState } from "react";
import { useI18n } from "./Providers";
import { Button } from "./controls";

const TONES = ["k1", "k2", "k3", "k4"];
const ART = [
  <div className="a-bar" key="bar" />,
  <div className="a-coin" key="coin" />,
  <div className="a-vault" key="vault">
    <i />
  </div>,
  <div className="a-ring" key="ring" />,
];

/** "Why buy gold with GoldGram?": four panels that open; the first starts open. */
export function WhyPanels() {
  const { t } = useI18n();
  const [open, setOpen] = useState<boolean[]>([true, false, false, false]);
  const toggle = (i: number) => setOpen((state) => state.map((v, n) => (n === i ? !v : v)));

  return (
    <>
    <div className="stack why-row">
      {t.why.panels.map((panel, i) => (
        <div className={`panel ${TONES[i]}${open[i] ? " open" : ""}`} key={panel.t} onClick={() => toggle(i)}>
          <Button
            className="plus"
            type="button"
            aria-expanded={open[i]}
            aria-controls={`why-${i}`}
            aria-label={`${panel.t}. ${t.why.toggle}`}
            onClick={(e) => {
              e.stopPropagation();
              toggle(i);
            }}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Button>
          <h3>{panel.t}</h3>
          <div className="body" id={`why-${i}`}>
            <p>{panel.d}</p>
          </div>
          <div className="art">{ART[i]}</div>
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
