'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Play } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

/**
 * Interview body. The curator writes Markdown in the admin (interview_md) and
 * this is the only place that renders it, so the typography stays consistent
 * wherever an interview appears.
 *
 * The measure is capped at ~68 characters - an interview is read, not scanned,
 * and full-width lines on a 1440px screen are unreadable.
 */
const ARTICLE_COMPONENTS: Components = {
  h1: ({ node: _node, ...props }) => (
    <h2 className="mb-5 mt-12 font-serif text-2xl font-bold leading-snug text-ink first:mt-0 md:text-3xl" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="mb-4 mt-12 font-serif text-xl font-bold leading-snug text-ink first:mt-0 md:text-2xl" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="mb-3 mt-9 font-serif text-lg font-semibold text-ink first:mt-0" {...props} />
  ),
  p: ({ node: _node, ...props }) => (
    <p className="mb-6 text-[15px] leading-[1.95] text-ink-2 md:text-base" {...props} />
  ),
  strong: ({ node: _node, ...props }) => <strong className="font-semibold text-ink" {...props} />,
  em: ({ node: _node, ...props }) => <em className="not-italic text-lmsy-yellow" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-8 border-l-2 border-lmsy-yellow/60 pl-5 font-serif text-lg leading-relaxed text-ink md:pl-7 md:text-xl"
      {...props}
    />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul className="mb-6 list-disc space-y-2 pl-6 text-[15px] leading-[1.9] text-ink-2 md:text-base" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="mb-6 list-decimal space-y-2 pl-6 text-[15px] leading-[1.9] text-ink-2 md:text-base" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a
      className="text-lmsy-blue underline decoration-lmsy-blue/40 underline-offset-4 transition-colors hover:text-lmsy-yellow"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-12 border-border" {...props} />,
  code: ({ node: _node, ...props }) => (
    <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.9em] text-ink" {...props} />
  ),
};

interface InterviewArticleProps {
  markdown: string;
  videoUrl?: string | null;
}

export function InterviewArticle({ markdown, videoUrl }: InterviewArticleProps) {
  const { language } = useLanguage();

  return (
    <section className="mt-20 border-t border-border pt-12 md:pt-16">
      <div className="mx-auto max-w-[68ch]">
        <p className="mb-8 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-2">
          {t(language, 'project.interview')}
        </p>

        <div className="interview-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={ARTICLE_COMPONENTS}>
            {markdown}
          </ReactMarkdown>
        </div>

        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-12 inline-flex items-center gap-2.5 rounded-full border border-lmsy-yellow/40 bg-gradient-to-r from-lmsy-yellow/10 to-lmsy-blue/10 px-6 py-3 text-sm text-ink transition-colors hover:border-lmsy-yellow/70"
          >
            <Play className="h-4 w-4 text-lmsy-yellow" />
            {t(language, 'project.watchInterview')}
          </a>
        )}
      </div>
    </section>
  );
}
