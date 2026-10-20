"use client";

import { useState } from "react";
import type { HelpContent } from "@/content/help";
import { useI18n } from "./Providers";
import { Button } from "./controls";

/** The help centre list: search, category pills, live count and the empty state. */
export function HelpCentre({ content }: { content: HelpContent }) {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<Set<number>>(new Set());

  const needle = term.trim().toLowerCase();
  const matches = content.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (filter !== "all" && item.cat !== filter) return false;
      if (!needle) return true;
      const text = `${item.q} ${item.a.map((part) => (typeof part === "string" ? part : part.tbc)).join(" ")}`;
      return text.toLowerCase().includes(needle);
    });

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <>
      <div className="hc-crown">
        <div className="wrap hc-crown-in">
          <div className="hc-kick">{t.help.kicker}</div>
          <h1>{t.help.title}</h1>
          <p>{t.help.sub}</p>

          <div className="hc-search" role="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5 21 21" />
            </svg>
            <input type="search" placeholder={t.help.search} aria-label={t.help.search} value={term} onChange={(e) => setTerm(e.target.value)} />
            {term && (
              <Button className="hc-clear" type="button" aria-label={t.help.clear} onClick={() => setTerm("")}>
                ×
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="hc-pills">
          {[{ id: "all", label: t.help.all }, ...content.categories].map((c) => (
            <Button key={c.id} type="button" className={`hc-pill${filter === c.id ? " on" : ""}`} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.label}
            </Button>
          ))}
        </div>

        <div className="hc-count" aria-live="polite">
          <b>{matches.length}</b> {t.help.questions}
        </div>

        {content.categories.map((category) => {
          const rows = matches.filter(({ item }) => item.cat === category.id);
          if (rows.length === 0) return null;
          return (
            <div key={category.id}>
              <h2 className="hc-cat">
                {category.label}
                <span>{rows.length}</span>
              </h2>
              {rows.map(({ item, index }) => {
                const isOpen = open.has(index);
                return (
                  <div className={`hc-qa${isOpen ? " open" : ""}`} key={index}>
                    <Button type="button" className="hc-q" aria-expanded={isOpen} aria-controls={`hc-a-${index}`} onClick={() => toggle(index)}>
                      {item.q}
                      <i />
                    </Button>
                    {isOpen && (
                      <div className="hc-a" id={`hc-a-${index}`}>
                        <p>
                          {item.a.map((part, n) =>
                            typeof part === "string" ? (
                              <span key={n}>{part} </span>
                            ) : (
                              <span key={n}>
                                <span className="tbc">
                                  {t.help.toConfirm} {part.tbc}
                                </span>{" "}
                              </span>
                            ),
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="hc-empty" role="status">
            <b>{t.help.emptyTitle}</b>
            <span>{t.help.emptySub}</span>
          </div>
        )}
      </div>
    </>
  );
}
