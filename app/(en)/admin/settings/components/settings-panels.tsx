'use client';

import { motion } from 'framer-motion';
import type { HeroFields, Lang, PrefaceFields } from '../types';
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
      <h2 className="mb-6 font-serif text-2xl text-ink">{label}</h2>
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
      <h2 className="mb-6 font-serif text-2xl text-ink">{label}</h2>
      <div className="space-y-5">
        <TextArea label="Preface" value={content.preface} onChange={(value) => onChange(lang, 'preface', value)} />
        <Field label="Universe Title" value={content.universeTitle} onChange={(value) => onChange(lang, 'universeTitle', value)} />
        <TextArea label="Universe Subtitle" value={content.universeSubtitle} onChange={(value) => onChange(lang, 'universeSubtitle', value)} />
      </div>
    </motion.div>
  );
}
