'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ExternalLink, Play, BookOpen, Camera, FileText, Sparkles, Calendar, Briefcase, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { supabase, type Project } from '@/lib/supabase';
import { applyPublicProjectFilter } from '@/lib/project-visibility';
import { BackButton } from '@/components/back-button';
import { getLocalizedText } from '@/lib/localized-content';

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

const categoryLabels: Record<string, string> = {
  series: 'TV_SERIES',
  editorial: 'EDITORIAL',
  appearance: 'APPEARANCE',
  journal: 'JOURNAL',
  commercial: 'COMMERCIAL',
  // Legacy support
  music: 'MUSIC_VIDEO',
  magazine: 'MAGAZINE',
  daily: 'DAILY',
  travel: 'TRAVEL',
};

export default function ProjectsPage() {
  const { language } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      // Only the fields this list renders. `select('*')` also pulled
      // theme_statement, homepage_excerpt, cover_url and i18n blobs that the
      // timeline never uses.
      // Public visibility (see lib/project-visibility.ts): a project is
      // visitor-facing only when the admin opted it in via portal_visible
      // and it is not archived. Back-end containers (ingestion batches,
      // milestone archives) are management units, not front-end content.
      const { data, error } = await applyPublicProjectFilter(
        supabase
          .from('projects')
          .select('id, title, title_i18n, description, description_i18n, category, release_date, created_at, watch_url, curation_status')
      )
        .order('release_date', { ascending: false })
        .order('id', { ascending: false });

      if (!error && data) {
        setProjects(data as unknown as Project[]);
      }
      setLoading(false);
    }

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted border-t-foreground"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-8">
            <BackButton />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
              {t(language, 'projects.title')}
            </h1>
            <p className="text-lg text-ink-2 max-w-2xl">
              {t(language, 'projects.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects Timeline */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {projects.map((project, index) => {
              const Icon = categoryIcons[project.category] || Sparkles;
              const isEven = index % 2 === 0;

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
                        {/* Image/Visual */}
                        <div className={`relative aspect-[16/10] md:aspect-auto bg-gradient-to-br ${categoryColors[project.category] || 'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-950/30'} ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className="h-24 w-24 text-primary/20" />
                          </div>
                          <div className="absolute top-4 left-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur text-xs font-medium">
                              <Icon className="h-3 w-3" />
                              {categoryLabels[project.category] || project.category.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className={`p-6 md:p-10 flex flex-col justify-center ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                          {project.release_date && (
                            <time className="text-sm text-ink-2 mb-2">
                              {new Date(project.release_date).toLocaleDateString(language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </time>
                          )}

                          <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
                            {getLocalizedText(project.title_i18n, language, project.title)}
                          </h3>

                          {getLocalizedText(project.description_i18n, language, project.description) && (
                            <p className="text-ink-2 text-base md:text-lg leading-relaxed mb-6">
                              {getLocalizedText(project.description_i18n, language, project.description)}
                            </p>
                          )}

                          <div className="flex gap-3">
                            <Button
                              asChild
                              size="lg"
                              className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground hover:opacity-90"
                            >
                              <Link href={`/projects/${project.id}`}>
                                View Details
                              </Link>
                            </Button>

                            {project.watch_url && (
                              <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="border-lmsy-blue text-lmsy-blue hover:bg-lmsy-blue hover:text-foreground"
                              >
                                <a href={project.watch_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Watch
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

          {projects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-ink-2 text-lg">No projects found</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
