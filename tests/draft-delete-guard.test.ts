/**
 * Guards for the draft delete protection (remediation B2-T1, audit P1-4).
 *
 * The bug this closes: draft delete removed the R2 object before checking
 * whether published content (gallery_assets / projects / site_content_blocks)
 * still references the same object, so one mistaken delete could break live
 * images. These tests pin the reference matching, the two historical URL
 * formats, the same-batch exclusion rule, and the fail-closed loader.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeR2Key,
  buildReferenceIndex,
  planDraftObjectDeletion,
  blockReferencesKey,
  loadReferenceIndex,
  collectR2Failures,
  type SupabaseLike,
} from '../lib/draft-delete-guard.ts';
import type {
  GuardPagedBuilder,
  GuardQueryResult,
} from '../lib/data/gallery-assets.ts';

const CDN = 'https://cdn.lmsy.space';

/** A builder that simply resolves to one page - enough for the walk to await it. */
function settled(rows: unknown[] | null, error: unknown): GuardPagedBuilder {
  const value: GuardQueryResult = { data: rows, error };
  const page = {
    then<T1 = GuardQueryResult, T2 = never>(
      onFulfilled?: ((value: GuardQueryResult) => T1 | PromiseLike<T1>) | null,
      onRejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
    ): PromiseLike<T1 | T2> {
      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
    // order()/range() are never reached: the walk awaits the page immediately.
  };
  return page as unknown as GuardPagedBuilder;
}

/**
 * Stub Supabase client: table -> rows the query answers with.
 *
 * The builder is awaitable straight off select() (the guard's other reads stop
 * there) and slices on range(), so the paged reference walks can be exercised
 * past PostgREST's 1000-row cap.
 */
function stubClient(tables: Record<string, { data?: unknown[]; error?: unknown }>): SupabaseLike {
  return {
    from(table: string) {
      const result = tables[table] || { data: [] };

      return {
        select(): GuardPagedBuilder {
          const builder: GuardPagedBuilder = {
            order: () => builder,
            range: (from: number, to: number) =>
              settled((result.data ?? []).slice(from, to + 1), result.error ?? null),
            then: (onFulfilled, onRejected) =>
              Promise.resolve<GuardQueryResult>({
                data: result.data ?? null,
                error: result.error ?? null,
              }).then(onFulfilled, onRejected),
          };
          return builder;
        },
      };
    },
  };
}

describe('normalizeR2Key', () => {
  test('full CDN URL becomes a bare key', () => {
    assert.equal(normalizeR2Key(`${CDN}/magazines/2024/LMSY-MAG-20240101-001.webp`), 'magazines/2024/LMSY-MAG-20240101-001.webp');
  });

  test('bare key and leading-slash key normalize to the same value', () => {
    assert.equal(normalizeR2Key('draft/telegram/x.jpg'), normalizeR2Key('/draft/telegram/x.jpg'));
  });

  test('non-CDN absolute URLs still yield their path', () => {
    assert.equal(normalizeR2Key('https://example.com/a/b.webp'), 'a/b.webp');
  });
});

describe('buildReferenceIndex', () => {
  test('indexes gallery_assets, projects (both formats) and other drafts', () => {
    const index = buildReferenceIndex({
      galleryAssets: [{ image_url: `${CDN}/gallery/a.webp` }, { image_url: 'gallery/b.webp' }],
      projects: [
        { cover_url: 'projects/cover-c.webp', homepage_cover_url: `${CDN}/projects/home-d.webp` },
      ],
      otherDrafts: [{ r2_media_url: `${CDN}/draft/e.jpg`, r2_key: 'draft/f.jpg' }],
    });

    assert.deepEqual(index.get('gallery/a.webp'), ['gallery_assets.image_url']);
    assert.deepEqual(index.get('gallery/b.webp'), ['gallery_assets.image_url']);
    assert.deepEqual(index.get('projects/cover-c.webp'), ['projects.cover_url']);
    assert.deepEqual(index.get('projects/home-d.webp'), ['projects.homepage_cover_url']);
    assert.deepEqual(index.get('draft/e.jpg'), ['draft_items.r2_media_url']);
    assert.deepEqual(index.get('draft/f.jpg'), ['draft_items.r2_key']);
  });

  test('null and empty values are ignored', () => {
    const index = buildReferenceIndex({
      galleryAssets: [{ image_url: null }, { image_url: '' }],
      projects: [{ cover_url: null, homepage_cover_url: undefined }],
      otherDrafts: [{ r2_media_url: null, r2_key: null }],
    });
    assert.equal(index.size, 0);
  });
});

describe('planDraftObjectDeletion', () => {
  const index = buildReferenceIndex({
    galleryAssets: [{ image_url: `${CDN}/gallery/published.webp` }],
    projects: [{ cover_url: 'projects/cover.webp' }],
    otherDrafts: [{ r2_media_url: `${CDN}/draft/shared-with-other-draft.jpg` }],
  });

  test('published image: object is kept, row is still deleted', () => {
    const plans = planDraftObjectDeletion([{ id: 'd1', r2Key: 'gallery/published.webp' }], index);
    assert.equal(plans[0].action, 'keep-object');
    assert.deepEqual(plans[0].referencedBy, ['gallery_assets.image_url']);
  });

  test('project cover in bare-key format: object is kept', () => {
    const plans = planDraftObjectDeletion([{ id: 'd2', r2Key: 'projects/cover.webp' }], index);
    assert.equal(plans[0].action, 'keep-object');
    assert.deepEqual(plans[0].referencedBy, ['projects.cover_url']);
  });

  test('unreferenced draft: object is deleted', () => {
    const plans = planDraftObjectDeletion([{ id: 'd3', r2Key: 'draft/lonely.jpg' }], index);
    assert.equal(plans[0].action, 'delete-object');
    assert.deepEqual(plans[0].referencedBy, []);
  });

  test('draft with no R2 key: nothing to delete, no crash', () => {
    const plans = planDraftObjectDeletion([{ id: 'd4', r2Key: null }], index);
    assert.equal(plans[0].action, 'delete-object');
    assert.equal(plans[0].r2Key, null);
  });

  test('object shared with another draft outside the delete set: kept', () => {
    const plans = planDraftObjectDeletion(
      [{ id: 'd5', r2Key: 'draft/shared-with-other-draft.jpg' }],
      index
    );
    assert.equal(plans[0].action, 'keep-object');
    assert.deepEqual(plans[0].referencedBy, ['draft_items.r2_media_url']);
  });

  test('object shared only inside the delete set: deleted', () => {
    const sharedIndex = buildReferenceIndex({
      galleryAssets: [],
      projects: [],
      // the other draft row is excluded because it is part of the delete set
      otherDrafts: [],
    });
    const plans = planDraftObjectDeletion(
      [
        { id: 'd6', r2Key: 'draft/shared-in-batch.jpg' },
        { id: 'd7', r2Key: 'draft/shared-in-batch.jpg' },
      ],
      sharedIndex
    );
    assert.ok(plans.every((p) => p.action === 'delete-object'));
  });

  test('site_content_blocks embedding the CDN URL: object is kept', () => {
    const blocks = [
      { id: 'b1', content: { hero: { url: `${CDN}/magazines/2024/featured.webp` } } },
    ];
    assert.ok(blockReferencesKey(blocks, 'magazines/2024/featured.webp'));

    const plans = planDraftObjectDeletion(
      [{ id: 'd8', r2Key: 'magazines/2024/featured.webp' }],
      new Map(),
      blocks
    );
    assert.equal(plans[0].action, 'keep-object');
    assert.deepEqual(plans[0].referencedBy, ['site_content_blocks']);
  });

  test('site_content_blocks without the key: object is deleted', () => {
    const plans = planDraftObjectDeletion(
      [{ id: 'd9', r2Key: 'draft/not-in-blocks.jpg' }],
      new Map(),
      [{ id: 'b1', content: 'nothing here' }]
    );
    assert.equal(plans[0].action, 'delete-object');
  });
});

describe('loadReferenceIndex', () => {
  test('excludes the drafts being deleted from the draft reference source', async () => {
    const client = stubClient({
      gallery_assets: { data: [] },
      projects: { data: [] },
      site_content_blocks: { data: [] },
      draft_items: {
        data: [
          { id: 'keep-me', r2_media_url: `${CDN}/draft/a.jpg`, r2_key: null },
          { id: 'delete-me', r2_media_url: `${CDN}/draft/b.jpg`, r2_key: null },
        ],
      },
    });

    const { index } = await loadReferenceIndex(client, ['delete-me']);
    assert.deepEqual(index.get('draft/a.jpg'), ['draft_items.r2_media_url']);
    assert.equal(index.has('draft/b.jpg'), false);
  });

  test('throws when a reference source fails (caller must fail closed)', async () => {
    const client = stubClient({
      gallery_assets: { error: { message: 'boom' } },
      projects: { data: [] },
      site_content_blocks: { data: [] },
      draft_items: { data: [] },
    });

    await assert.rejects(() => loadReferenceIndex(client, []), /gallery_assets/);
  });

  test('reference reads are paged: assets past the 1000-row cap are still guarded', async () => {
    // A single .select() would stop at 1000 rows, so img-1199 would look
    // unreferenced and a mistaken delete would drop a published image.
    const rows = Array.from({ length: 1200 }, (_unused, i) => ({
      image_url: `${CDN}/gallery/img-${i}.webp`,
    }));
    const client = stubClient({
      gallery_assets: { data: rows },
      projects: { data: [] },
      site_content_blocks: { data: [] },
      draft_items: { data: [] },
    });

    const { index } = await loadReferenceIndex(client, []);
    assert.equal(index.has('gallery/img-0.webp'), true);
    assert.equal(index.has('gallery/img-999.webp'), true);
    assert.equal(index.has('gallery/img-1199.webp'), true);
  });
});

describe('collectR2Failures', () => {
  test('rejected and false results are reported; successes are not', () => {
    const deleteList = [
      { id: 'd1', r2Key: 'a.jpg' },
      { id: 'd2', r2Key: 'b.jpg' },
      { id: 'd3', r2Key: 'c.jpg' },
    ];
    const results: PromiseSettledResult<boolean>[] = [
      { status: 'fulfilled', value: true },
      { status: 'fulfilled', value: false },
      { status: 'rejected', reason: new Error('network') },
    ];

    assert.deepEqual(collectR2Failures(deleteList, results), [
      { id: 'd2', r2Key: 'b.jpg' },
      { id: 'd3', r2Key: 'c.jpg' },
    ]);
  });

  test('empty list yields no failures', () => {
    assert.deepEqual(collectR2Failures([], []), []);
  });
});
