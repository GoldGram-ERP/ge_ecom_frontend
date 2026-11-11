"use client";

import { MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { Direction } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Dict, type Locale, localePath } from "@/i18n";
import { needsPageView, pageView } from "@/lib/analytics";
import { api } from "@/lib/client-api";
import type { User } from "@/lib/types";

interface I18n {
  locale: Locale;
  t: Dict;
  /** Prefixes an in-site path with the current language: href("/shop") → "/ar/shop". */
  href: (path: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <Providers>");
  return value;
}

interface Session {
  /** undefined while the first check is running, null for a guest. */
  user: User | null | undefined;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<Session>({ user: undefined, refresh: async () => {} });
export const useSession = () => useContext(SessionContext);

export function Providers({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      setUser((await api<{ user: User }>("/auth/me")).user);
    } catch {
      setUser(null); // signed out, or the backend is unreachable: either way, act as a guest
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api<{ user: User }>("/auth/me").then(
      (res) => alive && setUser(res.user),
      () => alive && setUser(null),
    );
    return () => {
      alive = false;
    };
  }, []);

  const i18n = useMemo<I18n>(
    () => ({ locale, t: dict, href: (path) => localePath(locale, path) }),
    [locale, dict],
  );
  const session = useMemo<Session>(() => ({ user, refresh }), [user, refresh]);

  return (
    <I18nContext.Provider value={i18n}>
      <SessionContext.Provider value={session}>
        {/* Radix pieces default to left-to-right and motion ignores "reduce motion" unless told */}
        <Direction.Provider dir={locale === "ar" ? "rtl" : "ltr"}>
          <MotionConfig reducedMotion="user">
            <PageViews />
            {children}
          </MotionConfig>
        </Direction.Provider>
      </SessionContext.Provider>
    </I18nContext.Provider>
  );
}

/**
 * GA4 virtual_page_view on the first load and on every route change (R6), once the visitor's
 * sign-in is known and the new page's title is set. Pages queue their own events behind it (R7).
 */
function PageViews() {
  const pathname = usePathname();
  const { user } = useSession();
  useEffect(() => {
    if (user === undefined || !needsPageView()) return;
    // A tick later the new page's <title> is in place.
    const timer = setTimeout(() => {
      if (needsPageView()) pageView(user);
    }, 50);
    return () => clearTimeout(timer);
  }, [pathname, user]);
  return null;
}
