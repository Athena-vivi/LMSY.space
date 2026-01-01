'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Calendar, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import Image from 'next/image';
import { type Project } from '@/lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface ProjectClientProps {
  project: Project;
}

export default function ProjectClient({ project }: ProjectClientProps) {
  const { language } = useLanguage();

  // Category badges with colors
  const categoryColors = {
    series: 'bg-lmsy-yellow/20 text-lmsy-yellow border-lmsy-yellow',
    music: 'bg-lmsy-blue/20 text-lmsy-blue border-lmsy-blue',
    magazine: 'bg-purple-500/20 text-purple-500 border-purple-500',
  };

  const categoryNames = {
    series: 'TV Series',
    music: 'Music Video',
    magazine: 'Magazine',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Link href="/projects">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="h-4 w-4" />
            {t(language, 'profiles.back')}
          </Button>
        </Link>
      </div>

      {/* Project Content - Magazine Style */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-32"
      >
        <div className="max-w-5xl mx-auto">
          {/* Hero - Cover Image */}
          {project.cover_url && (
            <motion.div variants={item} className="mb-12">
              <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-border magazine-shadow-lg">
                <Image
                  src={project.cover_url}
                  alt={project.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </motion.div>
          )}

          {/* Title and Category */}
          <motion.div variants={item} className="mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${categoryColors[project.category]}`}>
                {categoryNames[project.category]}
              </span>
              {project.release_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    {new Date(project.release_date).toLocaleDateString(
                      language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </span>
                </div>
              )}
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
              {project.title}
            </h1>

            <Separator className="w-24 h-0.5 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
          </motion.div>

          {/* Description */}
          {project.description && (
            <motion.div variants={item} className="mb-12">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                  {project.description}
                </p>
              </div>
            </motion.div>
          )}

          {/* Watch/Action Button */}
          {project.watch_url && (
            <motion.div variants={item} className="mb-12">
              <a
                href={project.watch_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground rounded-lg font-medium hover:opacity-90 hover:shadow-lg hover:shadow-lmsy-yellow/20 transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                Watch Now
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          )}

          {/* Additional Info Section */}
          <motion.div
            variants={item}
            className="p-8 border-2 border-border rounded-lg bg-muted/30"
          >
            <h3 className="font-serif text-2xl font-bold text-foreground mb-4">
              Project Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium mt-1">{categoryNames[project.category]}</p>
              </div>
              {project.release_date && (
                <div>
                  <span className="text-muted-foreground">Release Date</span>
                  <p className="font-medium mt-1">
                    {new Date(project.release_date).toLocaleDateString(
                      language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
