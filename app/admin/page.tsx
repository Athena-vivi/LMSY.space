'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Upload,
  Inbox,
  Layers,
  Search,
  ExternalLink,
  Edit2,
  ArrowRight,
  Images,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { supabase, type Project } from '@/lib/supabase';
import { getImageUrl } from '@/lib/image-url';
import EditProjectModal from './projects/_components/edit-project-modal';

interface WorkbenchCounts {
  assets: number;
  drafts: number;
}

interface ProjectRow extends Project {
  counts: WorkbenchCounts;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  published: { label: 'PUBLISHED', className: 'text-green-300/80 border-green-400/30 bg-green-400/5' },
  draft: { label: 'CANDIDATE', className: 'text-lmsy-yellow/80 border-lmsy-yellow/30 bg-lmsy-yellow/5' },
  archived: { label: 'ARCHIVED', className: 'text-white/40 border-white/15 bg-white/5' },
  legacy: { label: 'LEGACY', className: 'text-lmsy-blue/70 border-lmsy-blue/25 bg-lmsy-blue/5' },
};

export default function AdminDashboard() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [unassignedDrafts, setUnassignedDrafts] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived' | 'legacy'>('all');

  // Edit modal state (reuse the list-page modal)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchWorkbench();
  }, []);

  const fetchWorkbench = async () => {
    setLoading(true);
    const [projectRes, assetRes, draftRes] = await Promise.all([
      supabase
        .schema('lmsy_archive')
        .from('projects')
        .select('id, title, category, release_date, cover_url, curation_status, watch_url, title_i18n, description, description_i18n, tags, portal_visible, portal_priority, theme_statement, theme_statement_i18n')
        .order('release_date', { ascending: false, nullsFirst: false }),
      supabase.schema('lmsy_archive').from('gallery_assets').select('id, project_id'),
      supabase.schema('lmsy_archive').from('draft_items').select('id, project_id, batch_id'),
    ]);

    if (projectRes.data && assetRes.data && draftRes.data) {
      const assetCounts: Record<string, number> = {};
      for (const a of assetRes.data) {
        if (a.project_id) assetCounts[a.project_id] = (assetCounts[a.project_id] || 0) + 1;
      }
      const draftCounts: Record<string, number> = {};
      let unassigned = 0;
      const batches = new Set<string>();
      for (const d of draftRes.data) {
        if (d.project_id) {
          draftCounts[d.project_id] = (draftCounts[d.project_id] || 0) + 1;
        } else {
          unassigned += 1;
        }
        if (d.batch_id) batches.add(d.batch_id);
      }
      setUnassignedDrafts(unassigned);
      setBatchCount(batches.size);
      setProjects(
        (projectRes.data as Project[]).map((p) => ({
          ...p,
          counts: { assets: assetCounts[p.id] || 0, drafts: draftCounts[p.id] || 0 },
        }))
      );
    }
    setLoading(false);
  };

  const statusOf = (p: ProjectRow): string => p.curation_status ?? 'legacy';

  const categoryOptions = useMemo(
    () => ['all', ...Array.from(new Set(projects.map((p) => p.category).filter(Boolean)))],
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesQuery =
        q.length === 0 ||
        [p.title, p.description, p.id].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'all' || statusOf(p) === statusFilter;
      return matchesQuery && matchesStatus;
    });
    // categoryOptions unused here on purpose; category filter lives on the projects page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, searchQuery, statusFilter]);

  const handleUpdate = () => {
    fetchWorkbench();
  };

  const totalAssets = projects.reduce((s, p) => s + p.counts.assets, 0);
  const totalDrafts = projects.reduce((s, p) => s + p.counts.drafts, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-light text-white/90 tracking-tight">PROJECT WORKBENCH</h1>
          <p className="text-xs font-mono text-white/30 tracking-wider">
            {projects.length} PROJECTS · {totalAssets} PUBLISHED ASSETS · {totalDrafts} PENDING IN PROJECTS
          </p>
        </div>
        <Link
          href="/admin/upload"
          className="flex items-center gap-2 self-start border border-white/10 px-4 py-2 text-xs font-mono text-white/50 transition-colors hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80"
        >
          <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
          UPLOAD_IMAGES
        </Link>
      </div>

      {/* Entry tiles */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/admin/drafts" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 border p-5 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="p-2.5 bg-white/5 group-hover:bg-white/10 transition-colors">
              <Inbox className="h-5 w-5 text-lmsy-blue/70" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-2xl text-white/90">{unassignedDrafts}</div>
              <div className="text-[10px] font-mono text-white/30 tracking-widest">PENDING_IMAGES_UNGROUPED</div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
          </motion.div>
        </Link>
        <Link href="/admin/batches" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 border p-5 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="p-2.5 bg-white/5 group-hover:bg-white/10 transition-colors">
              <Layers className="h-5 w-5 text-lmsy-yellow/70" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-2xl text-white/90">{batchCount}</div>
              <div className="text-[10px] font-mono text-white/30 tracking-widest">INGEST_BATCHES</div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
          </motion.div>
        </Link>
        <Link href="/admin/gallery?tab=all" className="group">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 border p-5 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="p-2.5 bg-white/5 group-hover:bg-white/10 transition-colors">
              <Images className="h-5 w-5 text-white/50" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-2xl text-white/90">{totalAssets}</div>
              <div className="text-[10px] font-mono text-white/30 tracking-widest">ASSET_VAULT_ALL</div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" strokeWidth={1.5} />
          </motion.div>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 border px-4 py-3 md:flex-row md:items-center md:justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="relative md:max-w-sm md:flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH_PROJECTS"
            className="w-full border bg-transparent py-2 pl-9 pr-3 font-mono text-xs tracking-wider text-white/80 outline-none transition-colors placeholder:text-white/20"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="border bg-black px-3 py-2 font-mono text-xs tracking-wider text-white/70 outline-none"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <option value="all">ALL_STATUS</option>
          <option value="draft">CANDIDATE</option>
          <option value="published">PUBLISHED</option>
          <option value="archived">ARCHIVED</option>
          <option value="legacy">LEGACY</option>
        </select>
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-lmsy-yellow/60" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="border px-4 py-16 text-center text-xs font-mono tracking-wider text-white/25"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          NO_MATCHING_PROJECTS
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((p, index) => {
            const status = STATUS_STYLES[statusOf(p)] || STATUS_STYLES.legacy;
            const coverUrl = getImageUrl(p.cover_url);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.4) }}
                className="group border transition-colors hover:border-white/20"
                style={{ borderColor: 'rgba(255,255,255,0.08)' }}
              >
                {/* Cover + workspace entry */}
                <Link href={`/admin/projects/${p.id}/curate`} className="relative block aspect-[16/9] overflow-hidden bg-white/5">
                  {coverUrl ? (
                    <Image src={coverUrl} alt={p.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Images className="h-8 w-8 text-white/10" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="font-serif text-lg text-white/90 truncate">{p.title}</h3>
                    <p className="text-[10px] font-mono text-white/40 tracking-wider">
                      {p.category?.toUpperCase() || 'UNCATEGORIZED'}
                      {p.release_date ? ` · ${p.release_date}` : ''}
                    </p>
                  </div>
                  <span className={`absolute right-3 top-3 border px-2 py-0.5 text-[10px] font-mono tracking-widest backdrop-blur-sm ${status.className}`}>
                    {status.label}
                  </span>
                </Link>

                {/* Counts + actions */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider">
                    <span className="text-white/60">
                      <span className="text-white/90">{p.counts.assets}</span> <span className="text-white/30">PUBLISHED</span>
                    </span>
                    <span className={p.counts.drafts > 0 ? 'text-lmsy-yellow/90' : 'text-white/30'}>
                      <span>{p.counts.drafts}</span> <span className="text-white/30">PENDING</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/projects/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-white/20 transition-colors hover:text-lmsy-blue/80"
                      title="View live"
                    >
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedProject(p);
                        setEditModalOpen(true);
                      }}
                      className="p-1.5 text-white/20 transition-colors hover:text-lmsy-yellow/70"
                      title="Edit project info"
                    >
                      <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    <Link
                      href={`/admin/projects/${p.id}/curate`}
                      className="ml-1 flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[10px] font-mono tracking-widest text-white/50 transition-colors hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80"
                    >
                      WORKSPACE
                      <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer utility links (previously on the old dashboard) */}
      <div className="flex flex-wrap items-center gap-4 border-t pt-4 text-[10px] font-mono tracking-widest text-white/25"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
      >
        <Link href="/admin/chronicle" className="transition-colors hover:text-white/60">CHRONICLE_EDIT</Link>
        <Link href="/admin/gallery?tab=editorial" className="transition-colors hover:text-white/60">EDITORIAL_STUDIO</Link>
        <Link href="/admin/gallery?tab=milestones" className="transition-colors hover:text-white/60">MILESTONES</Link>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
          INTEGRITY_CHECK moved to Asset Vault tools
        </span>
      </div>

      <EditProjectModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        project={selectedProject}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
