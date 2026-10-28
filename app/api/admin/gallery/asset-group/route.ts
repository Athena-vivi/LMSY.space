import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { revalidateContentSurfaces } from '@/lib/revalidate-content';
import { apiServerError } from '@/lib/security/http';

/**
 * Picture classes (the level-3 boxes: 演出图 / 机场图 / ...).
 *
 * A class is not its own row. Its name *is* the string in
 * gallery_assets.asset_group, so renaming one means rewriting that value on
 * every picture that carries it - and NULL is the unfiled bucket, which the
 * door reader and asset_group_covers both address as ''.
 *
 *   POST { action: 'move',   ids: string[], group: string | null }
 *        Files a batch of pictures into one class, or back to unfiled.
 *        Nothing else on the row changes: catalog_id, image_url and
 *        event_date are the picture's identity, the class is only a label.
 *
 *   POST { action: 'rename', projectId: string, from: string, to: string }
 *        Renames a class inside one event. asset_group is free text, so the
 *        same label on another event is that event's own class and is left
 *        alone: renaming here only moves this event's pictures. The event's
 *        declared order (projects.asset_groups) and picked cover
 *        (projects.asset_group_covers) are remapped with it, so the box keeps
 *        its settings.
 */

const MAX_MOVE = 500;
const MAX_NAME_LENGTH = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReadGroup = { ok: true; value: string | null } | { ok: false };

/** Normalises a class name: '' and whitespace mean the unfiled bucket. */
function readGroup(raw: unknown): ReadGroup {
  if (raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false };
  const value = raw.trim();
  if (value.length === 0) return { ok: true, value: null };
  if (value.length > MAX_NAME_LENGTH) return { ok: false };
  // Control characters would make the name unreadable in the tree and in
  // the ?group= URL segment.
  if (/[\u0000-\u001f\u007f]/.test(value)) return { ok: false };
  return { ok: true, value };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const action = body?.action;

    if (action === 'move') {
      const ids: string[] = Array.isArray(body?.ids)
        ? body.ids.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
        : [];

      if (ids.length === 0 || ids.length > MAX_MOVE) {
        return NextResponse.json(
          { error: `Expected 1-${MAX_MOVE} picture ids` },
          { status: 400 }
        );
      }

      const group = readGroup(body?.group ?? null);
      if (!group.ok) {
        return NextResponse.json(
          { error: `分类名不能超过 ${MAX_NAME_LENGTH} 个字符` },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .update({ asset_group: group.value })
        .in('id', ids)
        .select('id, catalog_id');

      if (error) return apiServerError('admin/gallery/asset-group:move', error.message);

      revalidateContentSurfaces();
      return NextResponse.json({
        success: true,
        moved: (data ?? []).length,
        group: group.value,
      });
    }

    if (action === 'rename') {
      const from = readGroup(body?.from ?? null);
      const to = readGroup(body?.to ?? null);

      if (!from.ok || !to.ok || from.value === null) {
        return NextResponse.json({ error: '分类名不合法' }, { status: 400 });
      }
      if (to.value === null) {
        return NextResponse.json(
          { error: '分类名不能为空；要合并回未分类，请把图片拖到「未分类」' },
          { status: 400 }
        );
      }
      if (from.value === to.value) {
        return NextResponse.json({ success: true, renamed: 0, unchanged: true });
      }

      const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : '';
      if (!UUID_RE.test(projectId)) {
        return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
      }

      // Merging two classes by renaming one onto the other would silently
      // double a box's contents, so it is refused rather than guessed at.
      // Scoped to this event: another event's 「机场图」 is its own class.
      const { count: clash, error: clashError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('asset_group', to.value);

      if (clashError) return apiServerError('admin/gallery/asset-group:rename', clashError.message);
      if ((clash ?? 0) > 0) {
        return NextResponse.json(
          { error: `这个活动里已经有「${to.value}」了，换个名字` },
          { status: 409 }
        );
      }

      const { data: renamed, error: renameError } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('gallery_assets')
        .update({ asset_group: to.value })
        .eq('project_id', projectId)
        .eq('asset_group', from.value)
        .select('id');

      if (renameError) return apiServerError('admin/gallery/asset-group:rename', renameError.message);

      // The declared order and the picked cover are keyed by the name, so both
      // have to move with it or the box would fall back to its first picture.
      const { data: project } = await supabaseAdmin
        .schema('lmsy_archive')
        .from('projects')
        .select('id, asset_groups, asset_group_covers')
        .eq('id', projectId)
        .maybeSingle();

      if (project) {
        const patch: Record<string, unknown> = {};

        const declared = (project as { asset_groups?: unknown }).asset_groups;
        if (Array.isArray(declared) && declared.includes(from.value)) {
          patch.asset_groups = declared.map((name) => (name === from.value ? to.value : name));
        }

        const covers = (project as { asset_group_covers?: unknown }).asset_group_covers;
        if (covers && typeof covers === 'object' && !Array.isArray(covers)) {
          const map = covers as Record<string, unknown>;
          if (from.value in map) {
            const next: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(map)) {
              next[key === from.value ? to.value : key] = value;
            }
            patch.asset_group_covers = next;
          }
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await supabaseAdmin
            .schema('lmsy_archive')
            .from('projects')
            .update(patch)
            .eq('id', projectId);
          if (error) return apiServerError('admin/gallery/asset-group:rename', error.message);
        }
      }

      revalidateContentSurfaces();
      return NextResponse.json({
        success: true,
        renamed: (renamed ?? []).length,
        from: from.value,
        to: to.value,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${String(action)}` }, { status: 400 });
  } catch (error) {
    return apiServerError('admin/gallery/asset-group', error);
  }
}
