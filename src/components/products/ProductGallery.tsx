"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return <div className="aspect-square rounded-xl bg-surface" />;

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-white/5">
        <Image src={images[active]} alt={alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-6" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border bg-white/5 ${i === active ? "border-accent" : "border-border"}`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
