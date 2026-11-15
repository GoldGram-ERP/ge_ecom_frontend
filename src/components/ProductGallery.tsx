"use client";

import Image from "next/image";
import { useState } from "react";
import { fmt } from "@/i18n";
import { useI18n } from "./Providers";
import { Button } from "./controls";

/**
 * A product's photos, whole and uncropped: the chosen one large, the others as thumbnails below.
 * `srcs` is each photo's address and `alts` its alt text, in order (MED-01): the dashboard's, or
 * the name with its number. The large photo is the page's main image (LCP): loaded first.
 */
export function ProductGallery({ imageIds, srcs, name, alts }: { imageIds: number[]; srcs: string[]; name: string; alts?: string[] }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(imageIds[0]);
  const alt = alts?.[imageIds.indexOf(shown)] ?? name;
  const src = (imageId: number) => srcs[imageIds.indexOf(imageId)];

  return (
    <div className="pdp-gallery">
      <div className="pdp-frame">
        {/* keyed, so a newly chosen photo fades in rather than swapping in place */}
        <Image key={shown} className="pdp-photo" src={src(shown)} alt={alt} width={720} height={720} sizes="(max-width: 900px) 100vw, 510px" loading="eager" fetchPriority="high" />

      </div>
      {imageIds.length > 1 ? (
        <div className="pdp-thumbs" role="group" aria-label={fmt(t.product.photos, { name })}>
          {imageIds.map((imageId, index) => (
            <Button
              key={imageId}
              type="button"
              className={`pdp-thumb${imageId === shown ? " on" : ""}`}
              aria-pressed={imageId === shown}
              aria-label={fmt(t.product.photo, { n: index + 1 })}
              onPointerDown={() => setShown(imageId)}
              onClick={() => setShown(imageId)}
            >
              <Image src={src(imageId)} alt="" width={120} height={120} sizes="76px" loading="lazy" />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
