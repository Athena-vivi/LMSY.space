'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clapperboard,
  FileText,
  Ticket,
  Plane,
  Briefcase,
  Camera,
  Compass,
  Archive,
  Sparkles,
  ExternalLink,
  MessageSquareText,
  Tv,
  Podcast,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { supabase, type Project } from '@/lib/supabase';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { pickCoversByProject } from '@/lib/project-covers';
import { getImageUrl } from '@/lib/image-url';
import { PageIntro } from '@/components/page-intro';
import { categoryMeta } from '@/lib/category-meta';
import { formatDisplayDate } from '@/lib/display-date';
import { getLocalizedText } from '@/lib/localized-content';
import { isThemeProject, resolveProjectKind } from '@/lib/project-kind';
import {
  aggregateProjectSpans,
  formatProjectSpan,
  projectSortDate,
  type ProjectSpan,
} from '@/lib/project-span';
import {
  HALLS_OUTSIDE_INDEX,
  INDEX_CATEGORIES,
  homeDoorEntryPath,
  normalizeCategory,
  subtypeTabs,
  SUBTYPES_BY_CATEGORY,
  type ProjectCategory,
} from '@/lib/category-registry';

const PROJECT_LIST_IMAGE_SIZES = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw';

/** Icon per hall. Presentation only; the vocabulary lives in the registry. */
const CATEGORY_ICONS: Record<ProjectCategory, React.ComponentType<{ className?: string }>> = {
  drama_work: Clapperboard,
  editorial: FileText,
  live_event: Ticket,
  public_appearance: Plane,
  commercial: Briefcase,
  interview: MessageSquareText,
  variety: Tv,
  radio: Podcast,
  live_stream: Radio,
  behind_the_scenes: Camera,
  personal_travel: Compass,
  early_archive: Archive,
};

const CATEGORY_TINTS: Record<ProjectCategory, string> = {
  drama_work: 'from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30',
  editorial: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-950/30',
  live_event: 'from-fuchsia-100 to-fuchsia-200 dark:from-fuchsia-900/30 dark:to-fuchsia-950/30',
  public_appearance: 'from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-950/30',
  commercial: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-950/30',
  interview: 'from-violet-100 to-violet-200 dark:from-violet-900/30 dark:to-violet-950/30',
  variety: 'from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-950/30',
  radio: 'from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-950/30',
  live_stream: 'from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-950/30',
  behind_the_scenes: 'from-zinc-100 to-zinc-200 dark:from-zinc-900/30 dark:to-zinc-950/30',
  personal_travel: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-950/30',
  early_archive: 'from-stone-100 to-stone-200 dark:from-stone-900/30 dark:to-stone-950/30',
};

const FALLBACK_TINT = 'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-950/30';

type ProjectCounts = Record<string, number>;

export function ProjectsClient({ lockedCategory }: { lockedCategory?: ProjectCategory } = {}) {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The category filter lives in the URL so a link from the homepage, the
  // search box or an old exhibition route all land on the same view.
  // /editorial re-uses this component with the filter locked, so the archive
  // does not maintain a second copy of the same list.
  const requested = lockedCategory ?? normalizeCategory(searchParams.get('category'));

  // `kind` is a second axis, not a hall: it narrows the list to theme projects
  // (a subject that spans several dates) without touching the category chips.
  const kindFilter = searchParams.get('kind') === 'theme' ? 'theme' : null;

  // `subtype` is a third axis, and unlike `kind` it only exists inside a hall
  // that has sub-classes (see SUBTYPES_BY_CATEGORY). An unknown value is
  // ignored rather than applied, so a hand-edited URL cannot empty the list.
  const requestedSubtype = searchParams.get('subtype');
  const currentSubtype = useMemo(() => {
    if (!requested || !requestedSubtype) return null;
    const allowed = SUBTYPES_BY_CATEGORY[requested] ?? [];
    return allowed.some((definition) => definition.value === requestedSubtype)
      ? requestedSubtype
      : null;
  }, [requested, requestedSubtype]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<ProjectCounts>({});
  const [spans, setSpans] = useState<Record<string, ProjectSpan>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      // Only the fields this list renders. Public visibility goes through the
      // shared rule: portal_visible, not archived, not an ingestion container.
      const { data, error } = await applyPublicProjectFilter(
        supabase
          .from('projects')
          .select(
            'id, slug, title, title_i18n, description, description_i18n, category, subtype, project_kind, event_date, release_date, created_at, watch_url, curation_status, cover_url'
          )
      )
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Only the halls whose entries live outside this namespace stay out of
        // the index (door 1, /talks, /live): listing them here would repeat a
        // door that already holds every row. Doors 2-5 keep an entry - their
        // cards open at the door address, so this page is an entrance, not a
        // second address.
        const rows = (data as unknown as Project[]).filter(
          (project) => !HALLS_OUTSIDE_INDEX.has(project.category ?? '')
        );

        const ids = rows.map((p) => p.id);
        let nextSpans: Record<string, ProjectSpan> = {};
        if (ids.length > 0) {
          // event_date is selected so a theme project can be dated by its
          // images instead of a single project-level date it does not have.
          const { data: assets } = await supabase
            .from('gallery_assets')
            .select('project_id, image_url, is_cover, catalog_id, event_date')
            .in('project_id', ids)
            .order('is_cover', { ascending: false })
            .order('created_at', { ascending: true, nullsFirst: false });

          if (assets) {
            setCovers(pickCoversByProject(assets));
            nextSpans = aggregateProjectSpans(
              assets as unknown as Array<{ project_id: string | null; event_date: string | null }>
            );
            const nextCounts: ProjectCounts = {};
            for (const row of assets) {
              const pid = (row as { project_id: string | null }).project_id;
              if (!pid) continue;
              nextCounts[pid] = (nextCounts[pid] ?? 0) + 1;
            }
            setCounts(nextCounts);
            setSpans(nextSpans);
          }
        }

        // Newest first, with one rule per kind: an event project is dated by
        // its own event date, a theme project by the latest image it holds.
        // Both were already covered by the query order for event projects, so
        // only theme rows can move - to where their newest photo belongs.
        const ordered = [...rows].sort((a, b) => {
          const aDate = projectSortDate(a, nextSpans[a.id]);
          const bDate = projectSortDate(b, nextSpans[b.id]);
          if (aDate && bDate && aDate !== bDate) return aDate < bDate ? 1 : -1;
          if (aDate && !bDate) return -1;
          if (!aDate && bDate) return 1;
          return (b.created_at || '').localeCompare(a.created_at || '');
        });

        setProjects(ordered);
      }
      setLoading(false);
    }

    fetchProjects();
  }, []);

  const setCategory = (value: ProjectCategory | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('category', value);
    else params.delete('category');
    // A sub-class belongs to one hall only. Carrying it across a hall switch
    // would filter the new hall by a value it does not know, i.e. an empty
    // page that looks like a bug.
    params.delete('subtype');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const setSubtype = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('subtype', value);
    else params.delete('subtype');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggleThemeKind = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (kindFilter) params.delete('kind');
    else params.set('kind', 'theme');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Only halls that hold at least one visible project get a chip; the full
  // eight-value vocabulary is documented in the registry and the database, but
  // a chip that leads to an empty list is noise on an index page.
  const availableCategories = useMemo(() => {
    const present = new Set(projects.map((p) => p.category));
    return INDEX_CATEGORIES.filter((definition) => present.has(definition.value));
  }, [projects]);

  // Counted over the whole hall, never over the already-filtered list: a tab
  // must keep showing its own total while another tab is active.
  const subtypeCounts = useMemo(() => {
    const out: Record<string, number> = {};
    if (!requested) return out;
    for (const project of projects) {
      if (project.category !== requested) continue;
      const value = project.subtype ?? '';
      if (value) out[value] = (out[value] ?? 0) + 1;
    }
    return out;
  }, [projects, requested]);

  const subTabs = useMemo(() => subtypeTabs(requested, subtypeCounts), [requested, subtypeCounts]);

  // The hall total includes rows with no sub-class, so "All" can legitimately
  // read one higher than the tabs sum to. That gap is the honest state of a
  // hall that still holds an unfiled row; hiding it would hide the row.
  const hallSize = useMemo(
    () => (requested ? projects.filter((p) => p.category === requested).length : 0),
    [projects, requested]
  );

  const visibleProjects = useMemo(() => {
    let list = projects;
    if (requested) list = list.filter((p) => p.category === requested);
    if (currentSubtype) list = list.filter((p) => p.subtype === currentSubtype);
    if (kindFilter) list = list.filter((p) => resolveProjectKind(p.project_kind) === kindFilter);
    return list;
  }, [projects, requested, currentSubtype, kindFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, 'projects.title')}
        description={t(language, 'projects.description')}
      />

      <section className="pb-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {!lockedCategory && (
            <button
              onClick={() => setCategory(null)}
              className={`px-5 py-2 text-sm font-medium transition-all duration-300 rounded-full border ${
                requested === null
                  ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black border-transparent shadow-lg shadow-lmsy-yellow/20'
                  : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
              }`}
            >
              {t(language, 'gallery.tagAll')}
            </button>
            )}
            {(lockedCategory
              ? availableCategories.filter((definition) => definition.value === lockedCategory)
              : availableCategories
            ).map((definition) => (
              <button
                key={definition.value}
                onClick={() => setCategory(definition.value)}
                className={`px-5 py-2 text-sm font-medium transition-all duration-300 rounded-full border ${
                  requested === definition.value
                    ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black border-transparent shadow-lg shadow-lmsy-yellow/20'
                    : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                }`}
              >
                {t(language, definition.labelKey)}
              </button>
            ))}

            {/* Second axis, kept apart from the halls: a theme project is not a
                category, it is a project whose subject returns across several
                dates. It stays visible even while no theme project is public
                yet - the entry was asked for, and hiding it would make the
                feature look broken the day it is used. */}
            {!lockedCategory && (
              <>
                <span aria-hidden className="w-px self-stretch bg-border" />
                <button
                  onClick={toggleThemeKind}
                  aria-pressed={kindFilter === 'theme'}
                  className={`px-5 py-2 text-sm font-medium transition-all duration-300 rounded-full border ${
                    kindFilter === 'theme'
                      ? 'border-lmsy-blue text-lmsy-blue bg-lmsy-blue/10'
                      : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                  }`}
                >
                  {t(language, 'projects.kindTheme')}
                </button>
              </>
            )}
          </div>

          {/* Sub-class tabs. Deliberately a different shape from the chips
              above: the pills pick a hall, these pick a section inside it.
              Two weights make the hierarchy readable without a second heading. */}
          {subTabs.length > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-1 border-b border-border/70">
              <button
                onClick={() => setSubtype(null)}
                aria-pressed={currentSubtype === null}
                className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
                  currentSubtype === null
                    ? 'border-lmsy-blue font-medium text-foreground'
                    : 'border-transparent text-ink-2 hover:text-foreground'
                }`}
              >
                {t(language, 'gallery.tagAll')}
                <span className="ml-1.5 font-mono text-xs text-ink-2/60">{hallSize}</span>
              </button>
              {subTabs.map((definition) => (
                <button
                  key={definition.value}
                  onClick={() => setSubtype(definition.value)}
                  aria-pressed={currentSubtype === definition.value}
                  className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
                    currentSubtype === definition.value
                      ? 'border-lmsy-blue font-medium text-foreground'
                      : 'border-transparent text-ink-2 hover:text-foreground'
                  }`}
                >
                  {t(language, definition.labelKey)}
                  <span className="ml-1.5 font-mono text-xs text-ink-2/60">
                    {subtypeCounts[definition.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {visibleProjects.map((project, index) => {
              const category = normalizeCategory(project.category);
              const Icon = (category && CATEGORY_ICONS[category]) || Sparkles;
              const isEven = index % 2 === 0;
              const meta = categoryMeta(project.category);
              const categoryLabel = t(language, meta.labelKey);
              const coverSource = covers[project.id] || project.cover_url || null;
              const coverUrl = coverSource ? getImageUrl(coverSource) : null;
              const localizedTitle = getLocalizedText(project.title_i18n, language, project.title);
              const localizedDescription = getLocalizedText(
                project.description_i18n,
                language,
                project.description
              );
              // An event project has one date; a theme project has the span its
              // images cover. The span is derived from the assets' event_date -
              // never typed in, never guessed from created_at.
              const themeProject = isThemeProject(project);
              const projectSpan = spans[project.id] ?? null;
              const dateLabel = themeProject
                ? formatProjectSpan(projectSpan, language)
                : formatDisplayDate(project.event_date, language);
              const dateTimeValue = themeProject ? projectSpan?.end : project.event_date;
              const imageCount = counts[project.id] ?? 0;
              // A row that belongs to a homepage door opens at that door's
              // address: the index is a way in, not a second home for the row.
              const href =
                homeDoorEntryPath(project) ?? `/projects/${project.slug || project.id}`;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: Math.min(index, 6) * 0.05 }}
                >
                  <Card className="group overflow-hidden border-0 magazine-shadow hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-0">
                      <div
                        className={`grid grid-cols-1 md:grid-cols-2 gap-0 ${
                          isEven ? '' : 'md:grid-flow-dense'
                        }`}
                      >
                        {/* 4:5, not the old 16:10 landscape box. Almost every cover
                            in this archive is a portrait frame (0.65-0.80), so a
                            landscape window threw away half the photo - usually the
                            faces. At 4:5 the crop drops to ~16%, and object-position
                            sits slightly above centre, where faces actually are.

                            The image itself is the door: a visitor aimed at a photo
                            should not have to find a "view details" button first. */}
                        <Link
                          href={href}
                          aria-label={localizedTitle}
                          className={`relative aspect-[4/5] overflow-hidden bg-gradient-to-br block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lmsy-blue focus-visible:ring-offset-2 ${
                            (category && CATEGORY_TINTS[category]) || FALLBACK_TINT
                          } ${isEven ? 'md:order-1' : 'md:order-2'}`}
                        >
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={localizedTitle}
                              fill
                              sizes={PROJECT_LIST_IMAGE_SIZES}
                              className="object-cover object-[50%_38%] transition-transform duration-700 group-hover:scale-[1.03]"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                              <Icon className="h-20 w-20 text-primary/25" />
                              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-2">
                                {t(language, 'projects.noImages')}
                              </span>
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-xs font-medium text-ink backdrop-blur">
                              <Icon className="h-3 w-3" />
                              {categoryLabel}
                            </span>
                          </div>
                        </Link>

                        <div
                          className={`p-6 md:p-10 flex flex-col justify-center ${
                            isEven ? 'md:order-2' : 'md:order-1'
                          }`}
                        >
                          {(dateLabel || imageCount > 0) && (
                            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-2">
                              {dateLabel && (
                                <time dateTime={dateTimeValue ?? undefined}>{dateLabel}</time>
                              )}
                              {dateLabel && imageCount > 0 && <span aria-hidden>·</span>}
                              {imageCount > 0 && (
                                <span>
                                  {t(language, 'projects.photoCount', { count: imageCount })}
                                </span>
                              )}
                            </div>
                          )}

                          <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
                            {localizedTitle}
                          </h3>

                          {localizedDescription && (
                            <p className="text-ink-2 text-base md:text-lg leading-relaxed mb-6 line-clamp-4">
                              {localizedDescription}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3">
                            <Button
                              asChild
                              size="lg"
                              className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black hover:opacity-90"
                            >
                              <Link href={href}>{t(language, 'common.viewDetails')}</Link>
                            </Button>

                            {project.watch_url && (
                              <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="border-lmsy-blue text-lmsy-blue hover:bg-lmsy-blue hover:text-background"
                              >
                                <a href={project.watch_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  {t(language, 'common.watch')}
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {visibleProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-ink-2 text-lg">
                {requested
                  ? t(language, 'projects.filteredEmpty')
                  : t(language, 'projects.emptyAll')}
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
