'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/language-provider';
import { localizeHref } from '@/lib/i18n-path';

/**
 * next/link with the language prefix applied at render time.
 *
 * English lives at the bare path (/timeline); zh/th/es/pt live under a prefix
 * (/zh/timeline), and every prefixed route is a re-export of the bare one. So
 * the prefix is purely a URL concern - authors keep writing the natural path,
 * and the import is the only line that differs from a plain link:
 *
 *   import { LocalizedLink as Link } from '@/components/localized-link';
 *
 * The resolution itself lives in lib/i18n-path.ts (localizeHref) so it can be
 * unit-tested without a renderer. Use LocalizedLink for every in-site path;
 * next/link directly is only for the admin shell or genuinely external URLs.
 */

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  children?: ReactNode;
};

export function LocalizedLink({ href, ...rest }: LocalizedLinkProps) {
  const pathname = usePathname();
  const { language } = useLanguage();

  return <Link href={localizeHref(language, pathname, href)} {...rest} />;
}
