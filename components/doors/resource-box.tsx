'use client';

import { LocalizedLink as Link } from '@/components/localized-link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/image-url';
import { MediaPlate } from '@/components/ui/media-plate';

/**
 * One resource box: portrait, floating label, same shape as the live-events
 * class box so the two timelines read as siblings. External links open in a
 * new tab; everything else routes inside the archive.
 *
 * Extracted from talks-timeline on 2026-10-26 so the live door can hang the
 * same Bilibili / YouTube boxes off its own nodes - the curator fills the
 * links in Settings > Live Video Links and they become clickable here.
 */
export function ResourceBox({
  href,
  external,
  cover,
  label,
  hint,
  icon,
}: {
  href: string;
  external?: boolean;
  cover: string | null;
  label: string;
  hint: string;
  icon: React.ReactNode;
}) {
  const coverUrl = cover ? getImageUrl(cover) : null;
  const inner = (
    <>
      {/* The plate is the yellow-blue wash whether or not a cover is pinned:
          an empty box reads as part of the archive, not as a broken picture. */}
      <MediaPlate className="aspect-[3/4]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={label}
            fill
            unoptimized
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2.5 pt-8">
          <p className="flex items-center gap-1.5 truncate font-serif text-sm font-bold text-white transition-colors group-hover:text-lmsy-yellow">
            {icon}
            {label}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            {hint}
          </p>
        </div>
      </MediaPlate>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card/40 transition-colors hover:border-lmsy-yellow/60"
      >
        {inner}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-xl border border-border bg-card/40 transition-colors hover:border-lmsy-blue/50"
    >
      {inner}
    </Link>
  );
}
