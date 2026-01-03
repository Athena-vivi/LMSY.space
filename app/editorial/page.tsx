'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
}

export default function EditorialPage() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    // Placeholder: Fetch articles from your API or file system
    setArticles([
      {
        slug: 'the-first-orbit',
        title: 'The First Orbit: How LMSY Began',
        excerpt: 'An in-depth exploration of Lookmhee and Sonya\'s first collaboration, the chemistry that sparked a phenomenon.',
        date: '2024-12-31',
        category: 'Origin Story',
        readTime: '8 min read',
      },
      {
        slug: 'yellow-and-blue',
        title: 'Yellow & Blue: The Color Theory',
        excerpt: 'Understanding the visual language of LMSY through their signature colors and what they represent.',
        date: '2025-01-05',
        category: 'Visual Analysis',
        readTime: '5 min read',
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-32 md:py-48 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-yellow/0 to-transparent rounded-full blur-3xl" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[50vw] h-[80vw] bg-gradient-radial from-lmsy-blue/5 via-lmsy-blue/0 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <p className="text-sm md:text-base text-lmsy-yellow font-medium tracking-widest uppercase mb-4">
              Editorial
            </p>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
              Deep Dives
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Curated long-form writing exploring the artistry, chemistry, and cultural impact of Lookmhee & Sonya.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {articles.map((article, index) => (
              <motion.article
                key={article.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Link href={`/editorial/${article.slug}`}>
                  <div className="relative h-96 rounded-lg bg-gradient-to-br from-muted/50 to-muted border border-border overflow-hidden p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl">
                    {/* Category Badge */}
                    <div className="absolute top-6 left-6">
                      <span className="inline-block px-3 py-1 text-xs font-medium tracking-wider uppercase bg-lmsy-yellow/20 text-lmsy-yellow rounded-full">
                        {article.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col justify-end">
                      <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4 group-hover:text-lmsy-blue transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-muted-foreground mb-6 line-clamp-3">
                        {article.excerpt}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <time>{new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
                        </div>
                        <span>{article.readTime}</span>
                      </div>
                    </div>

                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
