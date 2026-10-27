/**
 * An event code has to be recognisable, not exhaustive.
 *
 * The event code is the third segment of a drama subject, and it is derived
 * from the event title. Titles describe; codes identify. "Promotional Image
 * Gallery" is a description, and spelling it out produced
 *
 *   LMSY-DRAMA-AFFAIR-FOOTAGE-PROMOTIONALIMAGEGALLERY-001
 *
 * whose subject segment alone was 41 characters. Two rules keep that from
 * happening again, and one escape hatch covers what the rules cannot know.
 *
 * What must stay true:
 *   - words naming the carrier (image / photo / video / gallery) are dropped
 *     the same way "Awards" is: every entry in the archive is made of them, so
 *     they never tell two batches apart;
 *   - a code is cut at 16 characters, on a word boundary, with two characters
 *     reserved for a trailing year - the year is what separates two editions of
 *     the same award;
 *   - the wizard lets a curator shorten the tail before it is stamped, and
 *     leaves it alone once the number exists (it is in the file names already).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildProjectCatalogId, eventCodeFromTitle } from '../lib/catalog-id.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (p: string) => readFileSync(path.join(ROOT, p), 'utf-8');

describe('carrier words are not part of the code', () => {
  test('a gallery of promotional images is just PROMOTIONAL', () => {
    assert.equal(eventCodeFromTitle('Promotional Image Gallery', 'AFFAIR'), 'PROMOTIONAL');
  });

  test('the words that name a carrier are dropped in any position', () => {
    assert.equal(eventCodeFromTitle('Behind the Scenes Video'), 'BEHINDSCENES');
    assert.equal(eventCodeFromTitle('Press Photos'), 'PRESS');
    assert.equal(eventCodeFromTitle('Gallery'), '');
  });

  test('a word that identifies the batch survives', () => {
    // STILLS tells one set from another, so it is not a carrier word.
    assert.equal(eventCodeFromTitle('Series Stills', 'AFFAIR'), 'SERIESSTILLS');
    assert.equal(eventCodeFromTitle('Episode Teasers', 'HARMONY'), 'EPISODETEASERS');
  });
});

describe('the code fits in the budget', () => {
  test('a descriptive title is cut to the words that fit', () => {
    const code = eventCodeFromTitle('a really long descriptive title that keeps going and going forever');
    assert.equal(code, 'REALLYLONG');
    assert.ok(code.length <= 16);
  });

  test('codes the spec already uses are untouched', () => {
    assert.equal(eventCodeFromTitle('Affair Highlights', 'AFFAIR'), 'HIGHLIGHTS');
    assert.equal(eventCodeFromTitle('Final Episode', 'AFFAIR'), 'FINALEPISODE');
    assert.equal(eventCodeFromTitle('THE FINAL SECRET DEAL', 'HARMONY'), 'FINALSECRETDEAL');
    assert.equal(eventCodeFromTitle('Only We Know', 'HARMONY'), 'ONLYWEKNOW');
  });

  test('a trailing year keeps its two characters', () => {
    assert.equal(eventCodeFromTitle('Y Entertain Awards 2024'), 'YENTERTAIN24');
    assert.equal(eventCodeFromTitle('Y Entertain Awards 2025'), 'YENTERTAIN25');
    // Longer lead words must not squeeze the year out.
    const code = eventCodeFromTitle('Change2561 Showcase Awards 2024');
    assert.ok(code.endsWith('24'), `year survives: ${code}`);
    assert.ok(code.length <= 16, `within budget: ${code}`);
  });

  test('a word is never cut in half', () => {
    const code = eventCodeFromTitle('Extraordinary Showcase');
    assert.ok(!code.endsWith('EXTRAORDIN'), 'not a partial word');
    assert.equal(code, 'EXTRAORDINARY');
  });

  test('the whole id stays readable', () => {
    const code = eventCodeFromTitle('Promotional Image Gallery', 'AFFAIR');
    const id = buildProjectCatalogId('DRAMA', `AFFAIR-FOOTAGE-${code}`, null, 'LMSY');
    assert.equal(id, 'LMSY-DRAMA-AFFAIR-FOOTAGE-PROMOTIONAL');
    assert.ok((id as string).length < 40, `was 52 characters before: ${id}`);
  });
});

describe('the wizard lets the tail be shortened', () => {
  const wizard = src('app/(en)/admin/drafts/components/modals/promote-wizard-modal.tsx');

  test('the last segment is an input, not a read-only line', () => {
    assert.ok(wizard.includes('setCodeDraft'), 'the tail is editable');
    assert.ok(wizard.includes('placeholder={subjectShape.tail}'), 'the derived tail is the placeholder');
  });

  test('only a tail written from a title is editable', () => {
    // The work / part codes and a live event's city are picks from a table;
    // letting them be retyped would break the hierarchy instead of shortening
    // a name.
    assert.ok(
      wizard.includes("level !== 'work' && level !== 'topic'"),
      'editing is limited to drama event codes and topic names'
    );
  });

  test('a stamped number is never re-spelled', () => {
    assert.ok(wizard.includes('project?.catalog_id'), 'an existing number turns editing off');
  });

  test('typing and leaving it empty both work', () => {
    assert.ok(wizard.includes('const tail = typed || subjectShape.tail;'), 'empty falls back to the title');
  });
});
