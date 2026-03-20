'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Loader2, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getImageUrl } from '@/lib/image-url';

interface ProjectOption {
  id: string;
  title: string;
  category: string;
  release_date: string | null;
  cover_url: string | null;
}

interface LinkProjectModalProps {
  draftId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (draftId: string, projectId: string) => Promise<boolean> | boolean;
}

export function LinkProjectModal({
  draftId,
  isOpen,
  onClose,
  onSelect,
}: LinkProjectModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingProjectId, setSubmittingProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setError(null);
      setSubmittingProjectId(null);
      return;
    }

    let cancelled = false;

    const loadProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/admin/projects', {
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load projects');
        }

        if (!cancelled) {
          setProjects(result.projects || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return projects;
    }

    return projects.filter((project) =>
      [project.title, project.id, project.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized))
    );
  }, [projects, searchQuery]);

  const handleSelect = async (projectId: string) => {
    if (!draftId) {
      return;
    }

    setSubmittingProjectId(projectId);
    try {
      const linked = await onSelect(draftId, projectId);
      if (linked) {
        onClose();
      }
    } finally {
      setSubmittingProjectId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl border-white/10 bg-black p-0 text-white shadow-2xl"
      >
        <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
          <DialogTitle className="font-serif text-xl font-light tracking-wide text-white/90">
            Link Existing Project
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] tracking-wider text-white/35">
            Select an existing project for this draft, then continue with WRITE_TO_ASSETS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by project title, ID, or category"
            className="w-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-wide text-white/85 outline-none transition-colors placeholder:text-white/25 focus:border-lmsy-yellow/40"
          />

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/40" />
            </div>
          ) : error ? (
            <div className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200/80">
              {error}
            </div>
          ) : (
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {filteredProjects.map((project) => {
                const coverUrl = getImageUrl(project.cover_url);
                const isSubmitting = submittingProjectId === project.id;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => void handleSelect(project.id)}
                    disabled={submittingProjectId !== null}
                    className="flex w-full items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-all hover:border-lmsy-yellow/30 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-white/5">
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
                          <Link2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="truncate font-serif text-sm text-white/90">
                        {project.title}
                      </div>
                      <div className="font-mono text-[10px] tracking-wider text-white/35">
                        {project.category.toUpperCase()} {project.release_date ? `· ${project.release_date}` : '· NO_DATE'}
                      </div>
                      <div className="truncate font-mono text-[10px] text-white/25">
                        {project.id}
                      </div>
                    </div>

                    <div className="shrink-0 font-mono text-[10px] tracking-wider text-lmsy-yellow/80">
                      {isSubmitting ? 'LINKING...' : 'SELECT'}
                    </div>
                  </button>
                );
              })}

              {filteredProjects.length === 0 && (
                <div className="rounded border border-white/10 bg-white/[0.02] px-4 py-8 text-center font-mono text-xs tracking-wider text-white/30">
                  NO_MATCHING_PROJECTS
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
