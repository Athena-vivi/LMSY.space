import type { Metadata } from 'next';

/**
 * Build page metadata with a correct self-referential canonical.
 *
 * The root layout used to declare `alternates.canonical: '/'`, which every page
 * inherited — so all pages told search engines they were the homepage. Sections
 * are client components and cannot export metadata themselves, so they declare
 * it in a nested layout instead.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
  };
}
