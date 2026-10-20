"use client";

import { type KeyboardEvent, type ReactNode, useId, useState } from "react";
import { Button } from "./controls";

/** Tabs over server-rendered panels. Arrow keys move between tabs, as the ARIA tabs pattern asks. */
export function ProductTabs({ tabs }: { tabs: { label: string; panel: ReactNode }[] }) {
  const id = useId();
  const [shown, setShown] = useState(0);

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const rtl = document.documentElement.dir === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, Home: -shown, End: tabs.length - 1 - shown }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (shown + step + tabs.length) % tabs.length;
    setShown(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <div className="pdp-tabs">
      <div className="pdp-tablist" role="tablist" onKeyDown={onKey}>
        {tabs.map((tab, n) => (
          <Button
            key={tab.label}
            type="button"
            role="tab"
            id={`${id}-tab-${n}`}
            aria-selected={n === shown}
            aria-controls={`${id}-panel-${n}`}
            tabIndex={n === shown ? 0 : -1}
            className={n === shown ? "on" : undefined}
            onClick={() => setShown(n)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {tabs.map((tab, n) => (
        <div key={tab.label} role="tabpanel" id={`${id}-panel-${n}`} aria-labelledby={`${id}-tab-${n}`} hidden={n !== shown} className="pdp-panel">
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
