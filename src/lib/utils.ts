/** Joins class names, skipping the empty ones. (The copied animate-ui primitives import this.) */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
