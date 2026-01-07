'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { MDXComponents } from '@/components/mdx-components';
import type { Article } from '@/lib/mdx';

interface EditorialArticleProps {
  article: Article;
}

export function EditorialArticle({ article }: EditorialArticleProps) {
  return (
    <article className="min-h-screen bg-background">
      {/* Back Navigation */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          href="/editorial"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Editorial</span>
        </Link>
      </div>

      {/* Article Hero */}
      <header className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-yellow/0 to-transparent rounded-full blur-3xl" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-blue/5 via-lmsy-blue/0 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Category Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-2 text-sm font-medium tracking-wider uppercase bg-lmsy-yellow/20 text-lmsy-yellow rounded-full">
                {article.category}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
            >
              {article.title}
            </motion.h1>

            {/* Excerpt */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground leading-relaxed mb-8"
            >
              {article.excerpt}
            </motion.p>

            {/* Meta Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time>
                  {new Date(article.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.readTime}</span>
              </div>
              {article.author && (
                <div>
                  <span>By {article.author}</span>
                </div>
              )}
            </motion.div>

            {/* Decorative Divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-12 h-px bg-gradient-to-r from-transparent via-lmsy-yellow to-transparent"
            />
          </div>
        </div>
      </header>

      {/* Article Content */}
      <main className="pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <MDXRemote
                source={article.content}
                components={MDXComponents}
              />
            </div>
          </motion.div>
        </div>
      </main>

      {/* Article Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-mono text-xs text-muted-foreground/60 tracking-widest mb-4">
              CURATED WITH LOVE BY <span className="text-lmsy-yellow">ASTRA</span>
            </p>
            <Link
              href="/editorial"
              className="inline-flex items-center gap-2 text-lmsy-blue hover:text-lmsy-yellow transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Read More Articles</span>
            </Link>
          </div>
        </div>
      </footer>
    </article>
  );
}
