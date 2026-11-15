import { notFound } from "next/navigation";

// Any address under /en or /ar that no page answers lands here, so the visitor gets the
// branded 404 in their language instead of the framework's default one. Rendered per request:
// caching every address that does not exist would never end.
export const dynamic = "force-dynamic";

export default function CatchAll() {
  notFound();
}
