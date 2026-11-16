// A product description is either plain text (every description written before the dashboard's
// editor) or the HTML the editor saves. The server cleans the HTML before it stores it, as it does
// for a guide's body, so it is rendered as written.

const TAG = /<\/?[a-z][a-z0-9]*(\s[^<>]*)?\/?>/i;

/** True for a description written in the editor: it holds at least one HTML tag. */
export function isHtmlDescription(text: string): boolean {
  return TAG.test(text);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

/**
 * The description as one line of plain text, for a product card, a meta description or JSON-LD:
 * tags give way to spaces, entities to their characters. Plain text only has its spaces tidied.
 */
export function descriptionText(text: string): string {
  const plain = isHtmlDescription(text)
    ? text.replace(/<[^<>]*>/g, " ").replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    : text;
  return plain.replace(/\s+/g, " ").trim();
}
