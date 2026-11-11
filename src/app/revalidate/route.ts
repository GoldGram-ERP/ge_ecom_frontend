import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

// On-demand revalidation (DSH-04): the backend posts { tags } after a save that changes public
// output, with x-revalidate-secret. The next request for a tagged page fetches fresh data.
export const dynamic = "force-dynamic";

const TAG = /^[a-z0-9:_\-.]{1,200}$/i;

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === "string" && TAG.test(t)).slice(0, 100) : [];
  if (!tags.length) return Response.json({ revalidated: false, message: "No valid tags" }, { status: 400 });
  // expire now: the next visitor gets the saved value (a price or title), not a stale copy.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: true, tags });
}
