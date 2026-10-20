import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";
import { flatten } from "@/i18n/texts";

// The site's built-in wording as a flat list: what the dashboard's "Website texts" screen
// shows beside each text an administrator can rewrite. Nothing here is private.
export const dynamic = "force-static";

export function GET() {
  return Response.json({ en: flatten(en), ar: flatten(ar) });
}
