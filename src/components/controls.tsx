"use client";

import { Select as RadixSelect } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Button as PressPrimitive } from "@/components/animate-ui/primitives/buttons/button";
import { Checkbox as CheckboxPrimitive, CheckboxIndicator } from "@/components/animate-ui/primitives/radix/checkbox";
import {
  RadioGroup as RadioGroupPrimitive,
  RadioGroupIndicator,
  RadioGroupItem,
} from "@/components/animate-ui/primitives/radix/radio-group";

// The storefront's controls, on library primitives (animate-ui for motion, Radix for behaviour)
// and dressed by the storefront's own CSS (styles/controls.css), so the pages look as before:
// the browser no longer draws anything itself, and what is pressed answers the press.

/** A button that gives under the finger. It keeps whatever classes the page gives it. */
export function Button(props: ComponentProps<typeof PressPrimitive>) {
  return <PressPrimitive hoverScale={1} tapScale={0.97} {...props} />;
}

/**
 * A select whose list is drawn by the page, never by the browser. `options` are
 * [value, label] pairs; `aria-labelledby` names the field for a screen reader.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  "aria-labelledby": labelledBy,
  "aria-label": label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, string])[];
  id?: string;
  className?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={(next) => onChange(next as T)}>
      <RadixSelect.Trigger id={id} className={`sel${className ? ` ${className}` : ""}`} aria-labelledby={labelledBy} aria-label={label}>
        <RadixSelect.Value />
        <RadixSelect.Icon className="sel-caret" aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content className="sel-list" position="popper" sideOffset={6} align="start">
          <RadixSelect.Viewport className="sel-view">
            {options.map(([optionValue, text]) => (
              <RadixSelect.Item className="sel-item" value={optionValue} key={optionValue}>
                <RadixSelect.ItemText>{text}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

/** A checkbox whose tick draws itself. Goes inside a `<label className="chk">` beside its text. */
export function Check({
  checked,
  onChange,
  "aria-label": label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <CheckboxPrimitive className="chk-box" checked={checked} onCheckedChange={(next) => onChange(next === true)} aria-label={label}>
      <CheckboxIndicator className="chk-tick" />
    </CheckboxPrimitive>
  );
}

/** A group of `Option`s of which one is chosen (how to receive the gold, how to pay). */
export function Options<T extends string>({
  value,
  onChange,
  children,
  "aria-label": label,
}: {
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
  "aria-label": string;
}) {
  return (
    <RadioGroupPrimitive value={value} onValueChange={(next) => onChange(next as T)} aria-label={label}>
      {children}
    </RadioGroupPrimitive>
  );
}

/** One choice: the radio, then whatever describes it. The whole row is the click target. */
export function Option({ value, id, children }: { value: string; id: string; children: ReactNode }) {
  return (
    <label className="opt" htmlFor={id}>
      <RadioGroupItem className="opt-radio" value={value} id={id}>
        <RadioGroupIndicator className="opt-dot" />
      </RadioGroupItem>
      {children}
    </label>
  );
}

/**
 * A section, article or div that fades up as it scrolls into view, once. It renders the element
 * itself (`as`), so the page's CSS selectors keep matching and a Server Component can use it.
 * With "reduce motion" switched on it is simply there.
 */
export function Reveal({
  as = "div",
  delay = 0,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article";
  /** Milliseconds, to let neighbours arrive one after another. */
  delay?: number;
  children: ReactNode;
  id?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const still = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      initial={still ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.6, delay: delay / 1000 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
