'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, MapPin } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { PageIntro } from '@/components/page-intro';
import { t } from '@/lib/languages';
import { supabase, type Project } from '@/lib/supabase';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { getLocalizedText } from '@/lib/localized-content';
import { formatDisplayDate, formatMonthYear } from '@/lib/display-date';
import { STREAM_CATEGORIES } from '@/lib/category-registry';

/**
 * /live - the door with no third party in the middle.
 *
 * Every other hall holds something that was filmed, edited and released by
 * somebody else. This one holds the streams they opened themselves: no cut, no
 * running time, no interviewer. That is the whole reason it is a separate door
 * instead of a tab - inside the talks list it would be buried under ninety
 * finished programmes.
 *
 * The archive does not host video, so each row links out when a link exists and
 * simply stays a record when it does not. It does not pretend to play anything:
 * an unlinked row is dated, titled and described, and that is all it claims.
 */

interface LiveRow extends Project {
  sortDate: string | null;
}

export function LiveClient() {
  const { language } = useLanguage();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await applyPublicProjectFilter(
        supabase
          .from('projects')
          .select(
            'id, slug, title, title_i18n, description, description_i18n, category, event_date, release_date, created_at, watch_url, location, cover_url, curation_status'
          )
      ).in('category', STREAM_CATEGORIES as unknown as string[]);

      if (error || !data) {
        console.error('[LIVE] failed to load:', error);
        setLoading(false);
        return;
      }

      const withSort = (data as unknown as Project[]).map((project) => ({
        ...project,
        sortDate: project.event_date ?? project.release_date ?? null,
      }));

      withSort.sort((a, b) => {
        if (a.sortDate && b.sortDate && a.sortDate !== b.sortDate) {
          return a.sortDate < b.sortDate ? 1 : -1;
        }
        if (a.sortDate && !b.sortDate) return -1;
        if (!a.sortDate && b.sortDate) return 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });

      setRows(withSort);
      setLoading(false);
    }
    load();
  }, []);

  const months = useMemo(() => {
    const buckets = new Map<string, LiveRow[]>();
    for (const row of rows) {
      const key = row.sortDate ? row.sortDate.slice(0, 7) : 'unknown';
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    }
    return [...buckets.entries()].sort((a, b) => {
      if (a[0] === 'unknown') return 1;
      if (b[0] === 'unknown') return -1;
      return a[0] < b[0] ? 1 : -1;
    });
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageIntro title={t(language, 'live.title')} description={t(language, 'live.description')} />

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {rows.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center text-lg text-ink-2"
            >
              {t(language, 'home.collecting')}
            </motion.p>
          )}

          <div className="space-y-12">
            {months.map(([monthKey, list]) => (
              <div key={monthKey}>
                <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
                  {monthKey === 'unknown' ? '—' : formatMonthYear(monthKey, language)}
                </h2>

                <ul className="divide-y divide-border/70 border-t border-border/70">
                  {list.map((row, index) => {
                    const title = getLocalizedText(row.title_i18n, language, row.title);
                    const description = getLocalizedText(
                      row.description_i18n,
                      language,
                      row.description
                    );
                    const dayLabel = formatDisplayDate(row.sortDate, language, {
                      month: 'short',
                      day: true,
                    });
                    const href = `/projects/${row.slug || row.id}`;

                    return (
                      <motion.li
                        key={row.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03 }}
                        className="flex items-start gap-4 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <Link
                              href={href}
                              className="font-serif text-lg font-semibold text-foreground transition-colors hover:text-lmsy-blue md:text-xl"
                            >
                              {title}
                            </Link>
                            {row.location ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                                <MapPin className="h-3 w-3" />
                                {row.location}
                              </span>
                            ) : null}
                          </div>
                          {description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-ink-2">{description}</p>
                          ) : null}
                        </div>

                        {dayLabel ? (
                          <time
                            dateTime={row.sortDate ?? undefined}
                            className="shrink-0 font-mono text-xs text-ink-2/80"
                          >
                            {dayLabel}
                          </time>
                        ) : null}

                        {row.watch_url ? (
                          <a
                            href={row.watch_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t(language, 'common.watch')}
                            className="shrink-0 rounded-full border border-lmsy-blue/40 p-2 text-lmsy-blue transition-colors hover:bg-lmsy-blue hover:text-background"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
