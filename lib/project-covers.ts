// Cover selection for project cards (phase-4 batch 1, Tasks 3 & 4).
// Pure logic, shared by the client-side /projects list and the server-rendered
// project detail "related projects" section. No fake covers are ever
// generated: a project with no assets simply gets no cover (callers render
// their own stable empty state).

export interface CoverAssetRow {
  project_id: string | null;
  image_url: string;
  is_cover?: boolean | null;
  catalog_id?: string | null;
}

// Priority: explicit is_cover flag, then the -000 catalog cover convention
// (same rule the detail page and /api/editorial already use), then the first
// row in the given order. Callers must pass a stable order (e.g. created_at
// ascending) so the fallback is deterministic.
export function pickCoverForProject(assets: CoverAssetRow[]): string | null {
  const flagged = assets.find((a) => a.is_cover);
  if (flagged) return flagged.image_url;
  const catalogCover = assets.find(
    (a) => a.catalog_id && a.catalog_id.endsWith('-000')
  );
  if (catalogCover) return catalogCover.image_url;
  return assets[0]?.image_url ?? null;
}

// Group rows by project and pick one cover per project. Rows with a NULL
// project_id are ignored (they cannot be attributed to any card).
export function pickCoversByProject(assets: CoverAssetRow[]): Record<string, string> {
  const byProject: Record<string, CoverAssetRow[]> = {};
  for (const asset of assets) {
    if (!asset.project_id) continue;
    (byProject[asset.project_id] ??= []).push(asset);
  }
  const covers: Record<string, string> = {};
  for (const [projectId, rows] of Object.entries(byProject)) {
    const url = pickCoverForProject(rows);
    if (url) covers[projectId] = url;
  }
  return covers;
}
