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
import {
  INDEX_CATEGORIES,
  normalizeCategory,
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

  const [projects, setProjects] = useState<Project[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<ProjectCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      // Only the fields this list renders. Public visibility goes through the
      // shared rule: portal_visible, not archived, not an ingestion container.
      const { data, error } = await applyPublicProjectFilter(
        supabase
          .from('projects')
          .select(
            'id, slug, title, title_i18n, description, description_i18n, category, event_date, release_date, created_at, watch_url, curation_status, cover_url'
          )
      )
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        const rows = data as unknown as Project[];
        setProjects(rows);

        const ids = rows.map((p) => p.id);
        if (ids.length > 0) {
          const { data: assets } = await supabase
            .from('gallery_assets')
            .select('project_id, image_url, is_cover, catalog_id')
            .in('project_id', ids)
            .order('is_cover', { ascending: false })
            .order('created_at', { ascending: true, nullsFirst: false });

          if (assets) {
            setCovers(pickCoversByProject(assets));
            const nextCounts: ProjectCounts = {};
            for (const row of assets) {
              const pid = (row as { project_id: string | null }).project_id;
              if (!pid) continue;
              nextCounts[pid] = (nextCounts[pid] ?? 0) + 1;
            }
            setCounts(nextCounts);
          }
        }
      }
      setLoading(false);
    }

    fetchProjects();
  }, []);

  const setCategory = (value: ProjectCategory | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('category', value);
    else params.delete('category');
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

  const visibleProjects = useMemo(
    () => (requested ? projects.filter((p) => p.category === requested) : projects),
    [projects, requested]
  );

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
          </div>
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
              const dateLabel = formatDisplayDate(project.event_date, language);
              const imageCount = counts[project.id] ?? 0;
              const href = `/projects/${project.slug || project.id}`;

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
                        <div
                          className={`relative aspect-[16/10] md:aspect-auto md:min-h-[320px] overflow-hidden bg-gradient-to-br ${
                            (category && CATEGORY_TINTS[category]) || FALLBACK_TINT
                          } ${isEven ? 'md:order-1' : 'md:order-2'}`}
                        >
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={localizedTitle}
                              fill
                              sizes={PROJECT_LIST_IMAGE_SIZES}
                              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
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
                        </div>

                        <div
                          className={`p-6 md:p-10 flex flex-col justify-center ${
                            isEven ? 'md:order-2' : 'md:order-1'
                          }`}
                        >
                          {(dateLabel || imageCount > 0) && (
                            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-2">
                              {dateLabel && (
                                <time dateTime={project.event_date ?? undefined}>{dateLabel}</time>
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
