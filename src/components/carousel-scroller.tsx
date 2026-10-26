"use client";

import { useRef } from "react";
import type { Locale } from "@/i18n";

/** A horizontal track with prev/next arrows. Cards are rendered on the server and passed as children. */
export function CarouselScroller({ children, label, locale }: { children: React.ReactNode; label: string; locale: Locale }) {
  const track = useRef<HTMLDivElement>(null);
  // Arrows move by most of a viewport; physical left/right, so they read the same in Arabic.
  const by = (sign: number) => track.current?.scrollBy({ left: sign * track.current.clientWidth * 0.8, behavior: "smooth" });
  const prev = locale === "ar" ? "السابق" : "Previous";
  const next = locale === "ar" ? "التالي" : "Next";

  return (
    <div className="carousel-wrap">
      <button type="button" className="carousel-arrow prev" aria-label={prev} onClick={() => by(-1)}>
        ‹
      </button>
      <div className="carousel" ref={track} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <button type="button" className="carousel-arrow next" aria-label={next} onClick={() => by(1)}>
        ›
      </button>
    </div>
  );
}
