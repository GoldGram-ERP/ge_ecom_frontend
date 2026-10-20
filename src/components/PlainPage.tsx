import { SiteHeader } from "./header-client";

/** A header and one quiet column, for the screens that have no prototype: legal pages, the 404 and the error screen. */
export function PlainPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="plain">
      <SiteHeader />
      <main className="wrap">
        <div className="plain-in">
          <h1>{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
