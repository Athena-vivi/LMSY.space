'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { categoryMeta } from '@/lib/category-meta';
import { getLocalizedText } from '@/lib/localized-content';
import { formatDisplayDate } from '@/lib/display-date';

interface FeaturedProject {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: unknown;
  category: string | null;
  event_date: string | null;
  cover: string | null;
}

/**
 * Featured Projects. The selection is computed server-side by
 * /api/home/summary from real rows: a hand-flagged project first, then the
 * archive's own priority, then the halls that best introduce the duo. Nothing
 * here is a hard-coded project id.
 */
export function FeaturedProjectsSection() {
  const { language } = useLanguage();
  const [projects, setProjects] = useState<FeaturedProject[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/home/summary');
        if (!response.ok) return;
        const data = await response.json();
        setProjects(data.featured ?? []);
      } catch (error) {
        console.error('[FEATURED] failed to load:', error);
      }
    }
    load();
  }, []);

  if (projects.length === 0) return null;

  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 md:mb-16 flex flex-wrap items-end justify-between gap-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'home.featuredTitle')}
              </span>
            </h2>
            <p className="text-ink-2 text-base md:text-lg font-light">
              {t(language, 'home.featuredSubtitle')}
            </p>
          </div>
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-2 transition-colors hover:text-ink"
          >
            {t(language, 'nav.projects')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {projects.map((project, index) => {
            const meta = categoryMeta(project.category);
            const title = getLocalizedText(project.title_i18n, language, project.title);
            const cover = project.cover ? getImageUrl(project.cover) : null;
            const href = `/projects/${project.slug || project.id}`;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.06 }}
              >
                <Link href={href} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-card/40">
                    {cover && (
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <span
                      className={`absolute top-3 left-3 inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur ${meta.accent}`}
                    >
                      {t(language, meta.labelKey)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="hover-gradient-text font-serif text-lg font-semibold leading-snug text-foreground">
                      {title}
                    </h3>
                    {project.event_date && (
                      <time
                        dateTime={project.event_date}
                        className="mt-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2"
                      >
                        {formatDisplayDate(project.event_date, language)}
                      </time>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
