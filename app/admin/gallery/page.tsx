'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { VaultHeader } from './components/vault-header';
import { VaultTabs } from './components/vault-tabs';
import { VaultFilterBar } from './components/vault-filter-bar';
import { AllAssetsView } from './components/views/all-assets-view';
import { EditorialView } from './components/views/editorial-view';
import { MilestonesView } from './components/views/milestones-view';
import { PortalsView } from './components/views/portals-view';
import { PortraitsView } from './components/views/portraits-view';
import { useVaultData } from './hooks/use-vault-data';
import { useVaultAssets } from './hooks/use-vault-assets';
import { VAULT_TABS, type VaultTabId } from './constants';

/**
 * Asset Vault Page
 *
 * Unified content management for:
 * - All Assets: every gallery image, one server page at a time
 * - Editorial: Magazine projects
 * - Portals: Homepage entry images
 * - Milestones: Homepage timeline images
 * - Portraits: Homepage people images
 *
 * Supports ?tab= URL parameter for direct tab linking, and ?q= / ?tag= /
 * ?projectId= so a filtered view can be linked or reloaded.
 */
export default function AssetVaultPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as VaultTabId | null;
  const projectIdParam = searchParams.get('projectId') || '';
  // The ALL tab filters in the database, so the active filters live in the URL
  // rather than in component state: reload and back keep the same view.
  const qParam = searchParams.get('q') ?? '';
  const tagParam = searchParams.get('tag') ?? '';
  const activeTab: VaultTabId =
    tabParam && VAULT_TABS.some((tab) => tab.id === tabParam) ? tabParam : 'all';

  // Fetch the vault-wide data the other tabs and the badges need.
  const { data, debug, loading, error, refetch } = useVaultData();

  // One server page of assets for the ALL tab.
  const assets = useVaultAssets({ q: qParam, tag: tagParam, projectId: projectIdParam });

  // The editorial tab still filters in memory: it holds ~20 projects, not rows.
  const editorialProjects = useMemo(() => {
    const projects = data.projects.filter((project) => project.category === 'editorial');
    if (!qParam) return projects;

    const query = qParam.toLowerCase();
    return projects.filter(
      (project) =>
        project.title?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [data.projects, qParam]);

  // Tag dropdown options come from the server: every tag in use, not just the
  // ones on the page that happens to be loaded.
  const uniqueTags = data.tags;

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleTabChange = (tab: VaultTabId) => {
    pushParams({ tab });
  };

  // The search box stays responsive while the URL update is debounced, so a
  // keystroke does not trigger a navigation (and a refetch) each time.
  const [searchDraft, setSearchDraft] = useState(qParam);
  const [adoptedQ, setAdoptedQ] = useState(qParam);

  // Adopt a URL value that changed from elsewhere: CLEAR_FILTER, back button.
  // Adjusting state during render is React's answer to "derive from props";
  // doing it in an effect would render the stale draft once first.
  if (qParam !== adoptedQ) {
    setAdoptedQ(qParam);
    setSearchDraft(qParam);
  }

  useEffect(() => {
    if (searchDraft.trim() === qParam) return;
    const timer = setTimeout(() => {
      pushParams({ q: searchDraft.trim() || null });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, qParam, pushParams]);

  const handleTagChange = (tag: string) => {
    pushParams({ tag: tag || null });
  };

  return (
    <div className="space-y-6">
      {/* Header - dynamic based on active tab */}
      <VaultHeader activeTab={activeTab} />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-mono text-red-300/80">
              {error}
            </p>
            <button
              onClick={refetch}
              className="shrink-0 border border-red-400/30 px-3 py-1 text-[10px] font-mono text-red-200/80 transition-colors hover:border-red-300/50 hover:text-red-100"
            >
              RETRY
            </button>
          </div>
        </div>
      )}

      {debug && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] font-mono text-ink-2">
            GALLERY {debug.gallery_total ?? 0} · PROJECTS {debug.projects_count}
            {debug.projects_truncated ? ' (LOAD TRUNCATED)' : ''}
            {' '}· PORTALS {debug.portal_count ?? 0} · MILESTONES {debug.milestone_count ?? 0} · TAGS {debug.tag_count ?? 0}
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <VaultTabs
        activeTab={activeTab}
        onChange={handleTabChange}
        data={data}
      />

      {/* Search and Filter Bar */}
      <VaultFilterBar
        activeTab={activeTab}
        searchQuery={searchDraft}
        setSearchQuery={setSearchDraft}
        filterTag={tagParam}
        setFilterTag={handleTagChange}
        uniqueTags={uniqueTags}
        projectId={projectIdParam}
      />

      {/* Content Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'all' && (
          <AllAssetsView
            key="all"
            assets={assets}
            projectFiltered={Boolean(projectIdParam)}
            filtered={Boolean(qParam || tagParam)}
          />
        )}
        {activeTab === 'editorial' && (
          <EditorialView key="editorial" data={{ projects: editorialProjects }} loading={loading} />
        )}
        {activeTab === 'portals' && (
          <PortalsView key="portals" data={{ portals: data.portals }} loading={loading} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesView key="milestones" data={{ milestones: data.milestones }} loading={loading} />
        )}
        {activeTab === 'portraits' && (
          <PortraitsView key="portraits" loading={loading} />
        )}
      </AnimatePresence>
    </div>
  );
}
