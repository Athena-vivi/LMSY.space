'use client';

import { motion } from 'framer-motion';
import { ExternalLink, FileText, FolderOpen, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Project } from '@/lib/supabase';
import { getImageUrl } from '@/lib/image-url';

interface EditorialViewProps {
  data: {
    projects: Project[];
  };
  loading: boolean;
}

function formatReleaseDate(value: string | null) {
  if (!value) {
    return 'NO_DATE';
  }

  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
}

export function EditorialView({ data, loading }: EditorialViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-pulse bg-lmsy-yellow/60" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 animate-pulse bg-lmsy-yellow/60" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 animate-pulse bg-lmsy-yellow/60" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (data.projects.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 py-20 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-white/10" strokeWidth={1.5} />
        <p className="text-sm text-white/40">No editorial projects found.</p>
        <p className="mt-2 text-xs font-mono text-white/20">
          Create or tag editorial projects to manage them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {data.projects.map((project, index) => {
        const coverUrl = getImageUrl(project.cover_url);

        return (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
          >
            <div className="grid grid-cols-[140px_1fr] gap-0 sm:grid-cols-[180px_1fr]">
              <div className="relative min-h-[180px] bg-white/5">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={project.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20">
                    <FileText className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 inline-flex rounded border border-lmsy-blue/30 bg-lmsy-blue/10 px-2 py-1 text-[10px] font-mono tracking-[0.16em] text-lmsy-blue/80">
                        {project.category.toUpperCase()}
                      </div>
                      <h3 className="font-serif text-xl text-white/90">
                        {project.title}
                      </h3>
                    </div>
                  </div>

                  {project.description && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-white/50">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-2 text-[11px] font-mono tracking-wider text-white/35">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{formatReleaseDate(project.release_date)}</span>
                    </div>
                    <div className="truncate">{project.id}</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/projects/${project.id}/curate`}
                    className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-mono tracking-wider text-white/55 transition-colors hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80"
                  >
                    <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                    CURATE
                  </Link>
                  <Link
                    href={`/projects/${project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-mono tracking-wider text-white/55 transition-colors hover:border-lmsy-blue/30 hover:text-lmsy-blue/80"
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    OPEN_LIVE
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
