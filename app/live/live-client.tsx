'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, MapPin } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { PageIntro } from '@/components/page-intro';
import { t, type TranslationKey } from '@/lib/languages';
import { supabase, type Project } from '@/lib/supabase';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { pickCoversByProject } from '@/lib/project-covers';
import { getImageUrl } from '@/lib/image-url';
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
 * Who held the phone comes from project_people, not from the title: 45 of the
 * first 55 streams were one of them alone, and a title suffix is a guessable
 * convention while a join row is a fact. Duo and solo are also the reason the
 * page has tabs at all - laid out flat, it reads as a Sonya archive.
 *
 * The archive does not host video, so each row links out when a link exists and
 * simply stays a record when it does not. It does not pretend to play anything:
 * an unlinked row is dated, titled and described, and that is all it claims.
 */

type LiveTab = 'all' | 'duo' | 'lookmhee' | 'sonya';

interface LiveRow extends Project {
  sortDate: string | null;
  peopleSlugs: string[];
}

/** project_people comes back as a nested array; profiles may be object or array. */
function peopleSlugsOf(relations: unknown): string[] {
  if (!Array.isArray(relations)) return [];
  const slugs: string[] = [];
  for (const relation of relations) {
    const profiles = (relation as { profiles?: unknown }).profiles;
    const list = Array.isArray(profiles) ? profiles : profiles ? [profiles] : [];
    for (const profile of list) {
      const slug = (profile as { slug?: string | null }).slug;
      if (slug) slugs.push(slug);
    }
  }
  return slugs;
}

export function LiveClient() {
  const { language } = useLanguage();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<LiveTab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await applyPublicProjectFilter(
        supabase
          .from('projects')
          .select(
            'id, slug, title, title_i18n, description, description_i18n, category, subtype, event_date, release_date, created_at, watch_url, location, cover_url, curation_status, project_people(role, profiles(slug))'
          )
      ).in('category', STREAM_CATEGORIES as unknown as string[]);

      if (error || !data) {
        console.error('[LIVE] failed to load:', error);
        setLoading(false);
        return;
      }

      const projects = data as unknown as Array<
        Project & { project_people?: unknown }
      >;

      if (projects.length > 0) {
        const { data: assets } = await supabase
          .from('gallery_assets')
          .select('project_id, image_url, is_cover, catalog_id')
          .in(
            'project_id',
            projects.map((project) => project.id)
          )
          .order('is_cover', { ascending: false })
          .order('created_at', { ascending: true, nullsFirst: false });
        if (assets) setCovers(pickCoversByProject(assets));
      }

      const withSort = projects.map((project) => ({
        ...project,
        peopleSlugs: peopleSlugsOf(project.project_people),
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

  const counts = useMemo(() => {
    const result: Record<LiveTab, number> = { all: rows.length, duo: 0, lookmhee: 0, sonya: 0 };
    for (const row of rows) {
      if (row.subtype === 'duo') result.duo += 1;
      // A solo tab counts solo streams only. A duo stream has both names on it,
      // and putting it under a person's tab would make the split meaningless.
      if (row.subtype === 'solo') {
        if (row.peopleSlugs.includes('lookmhee')) result.lookmhee += 1;
        if (row.peopleSlugs.includes('sonya')) result.sonya += 1;
      }
    }
    return result;
  }, [rows]);

  const visible = useMemo(() => {
    if (tab === 'all') return rows;
    if (tab === 'duo') return rows.filter((row) => row.subtype === 'duo');
    return rows.filter(
      (row) => row.subtype === 'solo' && row.peopleSlugs.includes(tab)
    );
  }, [rows, tab]);

  // Month buckets, newest first. Entries with no date at all go to the end -
  // they are still worth listing, but they cannot be placed.
  const months = useMemo(() => {
    const buckets = new Map<string, LiveRow[]>();
    for (const row of visible) {
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
  }, [visible]);

  const tabs: Array<{ key: LiveTab; labelKey: TranslationKey | null; literal?: string }> = [
    { key: 'all', labelKey: 'live.tabAll' },
    { key: 'duo', labelKey: 'live.tabDuo' },
    { key: 'lookmhee', labelKey: null, literal: 'Lookmhee' },
    { key: 'sonya', labelKey: null, literal: 'Sonya' },
  ];

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

      <section className="pb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {tabs.map((entry) => {
              // A tab that holds nothing stays clickable: the archive is being
              // filled, and a missing tab would read as "this never happened".
              const active = tab === entry.key;
              return (
                <button
                  key={entry.key}
                  onClick={() => setTab(entry.key)}
                  aria-pressed={active}
                  className={`px-5 py-2 text-sm font-medium transition-all duration-300 rounded-full border ${
                    active
                      ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black border-transparent shadow-lg shadow-lmsy-yellow/20'
                      : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                  }`}
                >
                  {entry.labelKey ? t(language, entry.labelKey) : entry.literal}
                  <span className={`ml-2 font-mono text-xs ${active ? 'text-black/60' : 'text-ink-2/70'}`}>
                    {counts[entry.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {visible.length === 0 && (
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
                    const coverSource = covers[row.id] ?? row.cover_url ?? null;
                    const cover = coverSource ? getImageUrl(coverSource) : null;
                    const dayLabel = formatDisplayDate(row.sortDate, language, {
                      month: 'short',
                      day: true,
                    });
                    // Video entries point outward - no page of our own.
                    const href = row.watch_url || null;

                    return (
                      <motion.li
                        key={row.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.03 }}
                        className="flex items-center gap-4 py-4"
                      >
                        {cover ? (
                          <MaybeLink
                            href={href}
                            className="relative hidden h-16 w-12 shrink-0 overflow-hidden rounded bg-muted sm:block"
                            ariaLabel={title}
                          >
                            <Image
                              src={cover}
                              alt={title}
                              fill
                              sizes="48px"
                              className="object-cover object-[50%_35%]"
                              unoptimized
                            />
                          </MaybeLink>
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <MaybeLink
                              href={href}
                              className="font-serif text-lg font-semibold text-foreground transition-colors hover:text-lmsy-blue md:text-xl"
                            >
                              {title}
                            </MaybeLink>
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

/**
 * A row that opens the source when there is one, and stays plain text when
 * there is not. Talks and live rows are video entries - they have no page of
 * their own, so this is the only affordance they get.
 */
function MaybeLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string | null;
  className: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
