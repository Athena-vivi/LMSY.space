'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ExternalLink, Play, BookOpen, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { supabase, type Project } from '@/lib/supabase';
import { CompactCatalogNumber } from '@/components/catalog-number';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('release_date', { ascending: false });

      if (!error && data) {
        setProjects(data);
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
            {projects.map((project, index) => {
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

                          {/* Catalog Number */}
                          <div className="absolute bottom-3 right-3">
                            <CompactCatalogNumber
                              id={project.id}
                              createdAt={project.created_at}
                              index={index}
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className={`p-6 md:p-10 flex flex-col justify-center ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                          {project.release_date && (
                            <time className="text-sm text-muted-foreground mb-2">
                              {new Date(project.release_date).toLocaleDateString(language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </time>
                          )}

                          <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
                            {project.title}
                          </h3>

                          {project.description && (
                            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-6">
                              {project.description}
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
              <p className="text-muted-foreground text-lg">No projects found</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
