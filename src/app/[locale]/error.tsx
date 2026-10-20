"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { PlainPage } from "@/components/PlainPage";
import { useI18n } from "@/components/Providers";
import { Button } from "@/components/controls";

// Shown when a page cannot load its data, typically because the backend is not answering (EC-15).
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PlainPage title={t.errors.pageTitle}>
      <p>{t.errors.pageText}</p>
      <Button className="place" type="button" onClick={() => retry()}>
        {t.errors.retry}
      </Button>
    </PlainPage>
  );
}
