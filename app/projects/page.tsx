'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Play, BookOpen, Camera, FileText, Sparkles, Calendar, Briefcase, Plane } from 'lucide-react';
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

const PROJECT_LIST_IMAGE_SIZES =
  '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  series: Play,
  editorial: FileText,
  appearance: Sparkles,
  journal: Calendar,
  commercial: Briefcase,
  // Legacy support
  music: BookOpen,
  magazine: Camera,
  // Daily-life and travel entries exist in the archive data; an unmapped
  // category must never crash the list (fallback below covers future ones).
  daily: Calendar,
  travel: Plane,
};

const categoryColors: Record<string, string> = {
  series: 'from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30',
  editorial: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-950/30',
  appearance: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-950/30',
  journal: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-950/30',
  commercial: 'from-violet-100 to-violet-200 dark:from-violet-900/30 dark:to-violet-950/30',
  // Legacy support
  music: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-950/30',
  magazine: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-950/30',
  daily: 'from-sky-100 to-sky-200 dark:from-sky-900/30 dark:to-sky-950/30',
  travel: 'from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-950/30',
};

// Asset counts per project, used for the "N images" line on each card. The
// count comes from the same single query that picks the covers, so it costs no
// extra round-trip and is never derived from anything but real rows.
type ProjectCounts = Record<string, number>;

export default function ProjectsPage() {
  const { language } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<ProjectCounts>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      // Only the fields this list renders. `select('*')` also pulled
      // theme_statement, homepage_excerpt and i18n blobs that the list never
      // uses; cover_url IS needed since phase 6 (it is the real database
      // cover for the 18 projects that have one).
      // Public visibility (see lib/project-visibility.ts): a project is
      // visitor-facing only when the admin opted it in via portal_visible
      // and it is not archived. Back-end containers (ingestion batches,
      // milestone archives) are management units, not front-end content.
      const { data, error } = await applyPublicProjectFilter(
        supabase
          .from('projects')
          .select('id, title, title_i18n, description, description_i18n, category, release_date, created_at, watch_url, curation_status, cover_url')
      )
        .order('release_date', { ascending: false })
        .order('id', { ascending: false });

      if (!error && data) {
        const rows = data as unknown as Project[];
        setProjects(rows);

        // Real covers: one batched query over the visible projects' assets,
        // picked with the shared is_cover / -000-catalog / first-asset rule.
        // The same rows give the per-project image count. A project without
        // asset rows falls back to its own database cover_url (real, admin
        // curated) and only then to the gradient+icon empty state - no
        // placeholder image is ever generated.
        const ids = rows.map((p) => p.id);
        if (ids.length > 0) {
          const { data: assets } = await supabase
            .from('gallery_assets')
            .select('project_id, image_url, is_cover, catalog_id')
            .in('project_id', ids)
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

  // Category chips derive from the categories that actually exist among the
  // visible projects - legacy music/magazine enum entries only appear if real
  // rows still use them (audit Task 3.4). Labels come from the shared
  // category-meta module so the list, the detail badge and the Chronicle all
  // read the same way.
  const categories = useMemo(
    () => Array.from(new Set(projects.map((p) => p.category))),
    [projects]
  );

  const visibleProjects = useMemo(
    () =>
      selectedCategory === 'All'
        ? projects
        : projects.filter((p) => p.category === selectedCategory),
    [projects, selectedCategory]
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

      {/* Category Filter Chips */}
      {!loading && categories.length > 1 && (
        <section className="pb-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap gap-3">
              {['All', ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 text-sm font-medium transition-all duration-300 rounded-full border ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-black border-transparent shadow-lg shadow-lmsy-yellow/20'
                      : 'bg-muted text-ink-2 border-border hover:border-lmsy-blue hover:text-lmsy-blue'
                  }`}
                >
                  {cat === 'All'
                    ? t(language, 'gallery.tagAll')
                    : t(language, categoryMeta(cat).labelKey)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Projects Timeline */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {visibleProjects.map((project, index) => {
              const Icon = categoryIcons[project.category] || Sparkles;
              const isEven = index % 2 === 0;
              const meta = categoryMeta(project.category);
              const categoryLabel = t(language, meta.labelKey as any);
              // Cover priority: real gallery asset > the project's own
              // database cover_url > gradient + icon. Two public projects have
              // zero assets; one of them does have a curated cover_url, which
              // this list used to ignore.
              const coverSource = covers[project.id] || project.cover_url || null;
              const coverUrl = coverSource ? getImageUrl(coverSource) : null;
              const localizedTitle = getLocalizedText(project.title_i18n, language, project.title);
              const localizedDescription = getLocalizedText(project.description_i18n, language, project.description);
              const dateLabel = formatDisplayDate(project.release_date, language);
              const imageCount = counts[project.id] ?? 0;

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
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 ${isEven ? '' : 'md:grid-flow-dense'}`}>
                        {/* Image/Visual - real cover when the project has
                            assets (or a curated cover_url), gradient+icon
                            empty state otherwise. The badge keeps a dark
                            scrim so it stays legible over any photo. */}
                        <div className={`relative aspect-[16/10] md:aspect-auto md:min-h-[320px] overflow-hidden bg-gradient-to-br ${categoryColors[project.category] || 'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-950/30'} ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={localizedTitle}
                              fill
                              sizes={PROJECT_LIST_IMAGE_SIZES}
                              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
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

                        {/* Content */}
                        <div className={`p-6 md:p-10 flex flex-col justify-center ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                          {(dateLabel || imageCount > 0) && (
                            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-[0.15em] text-ink-2">
                              {dateLabel && <time dateTime={project.release_date ?? undefined}>{dateLabel}</time>}
                              {dateLabel && imageCount > 0 && <span aria-hidden>·</span>}
                              {imageCount > 0 && (
                                <span>{t(language, 'projects.photoCount', { count: imageCount })}</span>
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
                              {/* Canonical detail entry (phase-4 batch 2):
                                  editorial works open in the Editorial
                                  surface, everything else in Projects. */}
                              <Link
                                href={project.category === 'editorial' ? `/editorial/${project.id}` : `/projects/${project.id}`}
                              >
                                {t(language, 'common.viewDetails')}
                              </Link>
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

          {visibleProjects.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-ink-2 text-lg">
                {selectedCategory === 'All'
                  ? t(language, 'projects.emptyAll')
                  : t(language, 'projects.filteredEmpty')}
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
