import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROJECT_KIND,
  hasProjectPointOnTimeline,
  isThemeProject,
  resolveProjectKind,
} from '../lib/project-kind.ts';
import {
  aggregateProjectSpans,
  formatProjectSpan,
  projectSortDate,
} from '../lib/project-span.ts';

test('resolveProjectKind keeps theme, and treats anything else as event', () => {
  assert.equal(resolveProjectKind('theme'), 'theme');
  assert.equal(resolveProjectKind('event'), 'event');
  assert.equal(resolveProjectKind(null), DEFAULT_PROJECT_KIND);
  assert.equal(resolveProjectKind(undefined), DEFAULT_PROJECT_KIND);
  assert.equal(resolveProjectKind(''), DEFAULT_PROJECT_KIND);
  assert.equal(resolveProjectKind('THEME'), DEFAULT_PROJECT_KIND);
});

test('isThemeProject / hasProjectPointOnTimeline agree on the default', () => {
  assert.equal(isThemeProject({ project_kind: 'theme' }), true);
  assert.equal(isThemeProject({ project_kind: 'event' }), false);
  assert.equal(isThemeProject({}), false);
  assert.equal(isThemeProject(null), false);

  assert.equal(hasProjectPointOnTimeline({ project_kind: 'theme' }), false);
  assert.equal(hasProjectPointOnTimeline({ project_kind: 'event' }), true);
  assert.equal(hasProjectPointOnTimeline({}), true);
});

test('aggregateProjectSpans takes the min and max confirmed image date', () => {
  const spans = aggregateProjectSpans([
    { project_id: 'a', event_date: '2025-08-01' },
    { project_id: 'a', event_date: '2024-03-20' },
    { project_id: 'a', event_date: '2026-03-15' },
    { project_id: 'b', event_date: '2024-02-14' },
  ]);

  assert.deepEqual(spans, {
    a: { start: '2024-03-20', end: '2026-03-15' },
    b: { start: '2024-02-14', end: '2024-02-14' },
  });
});

test('aggregateProjectSpans ignores undated and malformed rows', () => {
  const spans = aggregateProjectSpans([
    { project_id: 'a', event_date: null },
    { project_id: 'a', event_date: '2024-03' },
    { project_id: 'a', event_date: 'not-a-date' },
    { project_id: null, event_date: '2024-03-20' },
  ]);

  assert.deepEqual(spans, {});
});

test('aggregateProjectSpans keeps a project with only one dated image', () => {
  const spans = aggregateProjectSpans([{ project_id: 'a', event_date: '2026-03-20T00:00:00+00:00' }]);
  assert.deepEqual(spans, { a: { start: '2026-03-20', end: '2026-03-20' } });
});

test('formatProjectSpan renders one month when both ends fall in it', () => {
  assert.equal(
    formatProjectSpan({ start: '2026-03-20', end: '2026-03-20' }, 'en'),
    'Mar 2026'
  );
  assert.equal(
    formatProjectSpan({ start: '2026-03-02', end: '2026-03-20' }, 'en'),
    'Mar 2026'
  );
});

test('formatProjectSpan renders a range across months', () => {
  assert.equal(
    formatProjectSpan({ start: '2024-03-20', end: '2026-03-15' }, 'en'),
    'Mar 2024 — Mar 2026'
  );
  assert.equal(formatProjectSpan(null, 'en'), null);
  assert.equal(formatProjectSpan({ start: 'bad', end: 'worse' }, 'en'), null);
});

test('projectSortDate: theme uses the latest image date, event uses its own date', () => {
  const span = { start: '2024-03-20', end: '2026-03-15' };

  assert.equal(
    projectSortDate({ project_kind: 'theme', event_date: null, release_date: '2026-03-20' }, span),
    '2026-03-15'
  );
  assert.equal(
    projectSortDate({ project_kind: 'event', event_date: '2026-10-09', release_date: '2026-10-09' }),
    '2026-10-09'
  );
  assert.equal(
    projectSortDate({ project_kind: 'event', event_date: null, release_date: '2026-03-31' }),
    '2026-03-31'
  );
  assert.equal(projectSortDate({ project_kind: 'theme', event_date: null }, null), null);
});
