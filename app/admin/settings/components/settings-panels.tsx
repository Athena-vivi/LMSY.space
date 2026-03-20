'use client';

import { motion } from 'framer-motion';
import type { HeroFields, Lang, LongformFields, MilestonesFields, PrefaceFields } from '../types';
import { Field, TextArea } from './settings-inputs';

export function PrefacePanel({
  lang,
  label,
  content,
  onChange,
}: {
  lang: Lang;
  label: string;
  content: PrefaceFields;
  onChange: (lang: Lang, field: keyof PrefaceFields, value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-black/30 p-6"
    >
      <h2 className="mb-6 font-serif text-2xl text-white/90">{label}</h2>
      <div className="space-y-5">
        <Field label="Title" value={content.title} onChange={(value) => onChange(lang, 'title', value)} />
        <Field label="Subtitle" value={content.subtitle} onChange={(value) => onChange(lang, 'subtitle', value)} />
        <Field label="Preface Label" value={content.prefaceLabel} onChange={(value) => onChange(lang, 'prefaceLabel', value)} />
        <TextArea label="Paragraph 1" value={content.paragraph1} onChange={(value) => onChange(lang, 'paragraph1', value)} />
        <TextArea label="Paragraph 2" value={content.paragraph2} onChange={(value) => onChange(lang, 'paragraph2', value)} />
        <TextArea label="Paragraph 3" value={content.paragraph3} onChange={(value) => onChange(lang, 'paragraph3', value)} />
        <Field label="Besties Message" value={content.bestiesMessage} onChange={(value) => onChange(lang, 'bestiesMessage', value)} />
        <TextArea label="Welcome" value={content.welcome} onChange={(value) => onChange(lang, 'welcome', value)} />
        <Field label="Site Name" value={content.siteName} onChange={(value) => onChange(lang, 'siteName', value)} />
        <Field label="Site Description" value={content.siteDesc} onChange={(value) => onChange(lang, 'siteDesc', value)} />
        <Field label="Curator Title" value={content.curatorTitle} onChange={(value) => onChange(lang, 'curatorTitle', value)} />
        <Field label="Curator Signature" value={content.curatorSignature} onChange={(value) => onChange(lang, 'curatorSignature', value)} />
        <Field label="Date" value={content.date} onChange={(value) => onChange(lang, 'date', value)} />
      </div>
    </motion.div>
  );
}

export function LongformPanel({
  lang,
  label,
  content,
  onChange,
}: {
  lang: Lang;
  label: string;
  content: LongformFields;
  onChange: (lang: Lang, field: keyof LongformFields, value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-black/30 p-6"
    >
      <h2 className="mb-6 font-serif text-2xl text-white/90">{label}</h2>
      <div className="space-y-5">
        <Field label="Eyebrow" value={content.eyebrow} onChange={(value) => onChange(lang, 'eyebrow', value)} />
        <Field label="Fallback Title" value={content.fallbackTitle} onChange={(value) => onChange(lang, 'fallbackTitle', value)} />
        <TextArea label="Fallback Excerpt" value={content.fallbackExcerpt} onChange={(value) => onChange(lang, 'fallbackExcerpt', value)} />
        <Field label="Source" value={content.source} onChange={(value) => onChange(lang, 'source', value)} />
        <Field label="Read More Label" value={content.readMoreLabel} onChange={(value) => onChange(lang, 'readMoreLabel', value)} />
      </div>
    </motion.div>
  );
}

export function MilestonesPanel({
  lang,
  label,
  content,
  onChange,
}: {
  lang: Lang;
  label: string;
  content: MilestonesFields;
  onChange: (lang: Lang, field: keyof MilestonesFields, value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-black/30 p-6"
    >
      <h2 className="mb-6 font-serif text-2xl text-white/90">{label}</h2>
      <div className="space-y-5">
        <Field label="Section Title" value={content.sectionTitle} onChange={(value) => onChange(lang, 'sectionTitle', value)} />
        <Field label="2022" value={content.year2022} onChange={(value) => onChange(lang, 'year2022', value)} />
        <Field label="2023" value={content.year2023} onChange={(value) => onChange(lang, 'year2023', value)} />
        <Field label="2024" value={content.year2024} onChange={(value) => onChange(lang, 'year2024', value)} />
        <Field label="2025" value={content.year2025} onChange={(value) => onChange(lang, 'year2025', value)} />
        <Field label="Ongoing" value={content.ongoing} onChange={(value) => onChange(lang, 'ongoing', value)} />
        <TextArea label="Bottom Note" value={content.bottomNote} onChange={(value) => onChange(lang, 'bottomNote', value)} />
      </div>
    </motion.div>
  );
}

export function HeroPanel({
  lang,
  label,
  content,
  onChange,
}: {
  lang: Lang;
  label: string;
  content: HeroFields;
  onChange: (lang: Lang, field: keyof HeroFields, value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-black/30 p-6"
    >
      <h2 className="mb-6 font-serif text-2xl text-white/90">{label}</h2>
      <div className="space-y-5">
        <TextArea label="Preface" value={content.preface} onChange={(value) => onChange(lang, 'preface', value)} />
        <Field label="Universe Title" value={content.universeTitle} onChange={(value) => onChange(lang, 'universeTitle', value)} />
        <TextArea label="Universe Subtitle" value={content.universeSubtitle} onChange={(value) => onChange(lang, 'universeSubtitle', value)} />
      </div>
    </motion.div>
  );
}
