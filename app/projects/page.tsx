'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ExternalLink, Play, BookOpen, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

// Sample projects data - will be replaced with Supabase data
const projects = [
  {
    id: '1',
    title: 'Affair',
    category: 'series' as const,
    release_date: '2024-01-15',
    description: 'A compelling Thai GL series that explores complex emotions and forbidden relationships. The story follows two women whose lives intertwine in unexpected ways.',
    cover_url: '',
    watch_url: '#',
  },
  {
    id: '2',
    title: 'The Promise',
    category: 'series' as const,
    release_date: '2023-08-20',
    description: 'A heartfelt drama about keeping promises and the enduring power of love across time and circumstances.',
    cover_url: '',
    watch_url: '#',
  },
  {
    id: '3',
    title: 'Secret Love',
    category: 'series' as const,
    release_date: '2023-05-10',
    description: 'A romantic series exploring the nuances of hidden affection and the courage to reveal one\'s true feelings.',
    cover_url: '',
    watch_url: '#',
  },
  {
    id: '4',
    title: 'VOGUE Thailand',
    category: 'magazine' as const,
    release_date: '2024-03-01',
    description: 'Exclusive fashion spread showcasing elegance and contemporary style.',
    cover_url: '',
    watch_url: '#',
  },
  {
    id: '5',
    title: 'L\'Officiel Thailand',
    category: 'magazine' as const,
    release_date: '2024-06-15',
    description: 'A stunning editorial capturing the essence of modern Thai beauty and fashion.',
    cover_url: '',
    watch_url: '#',
  },
];

const categoryIcons = {
  series: Play,
  music: BookOpen,
  magazine: Camera,
};

const categoryColors = {
  series: 'from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30',
  music: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-950/30',
  magazine: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-950/30',
};

export default function ProjectsPage() {
  const { language } = useLanguage();

  // Sort by release date (newest first)
  const sortedProjects = [...projects].sort((a, b) =>
    new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
              {t(language, 'projects.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t(language, 'projects.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects Timeline */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {sortedProjects.map((project, index) => {
              const Icon = categoryIcons[project.category];
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="group overflow-hidden border-0 magazine-shadow hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-0">
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-0 ${isEven ? '' : 'md:grid-flow-dense'}`}>
                        {/* Image/Visual */}
                        <div className={`relative aspect-[16/10] md:aspect-auto bg-gradient-to-br ${categoryColors[project.category]} ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className="h-24 w-24 text-primary/20" />
                          </div>
                          <div className="absolute top-4 left-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-black/50 backdrop-blur text-xs font-medium">
                              <Icon className="h-3 w-3" />
                              {project.category.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className={`p-6 md:p-10 flex flex-col justify-center ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                          <time className="text-sm text-muted-foreground mb-2">
                            {new Date(project.release_date).toLocaleDateString(language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </time>
                          <h3 className="font-serif text-3xl md:text-4xl mb-4 group-hover:text-primary transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed mb-6">
                            {project.description}
                          </p>
                          {project.watch_url && project.watch_url !== '#' && (
                            <Link href={project.watch_url} target="_blank">
                              <Button variant="outline" className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                                {t(language, 'schedule.watchNow')}
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
