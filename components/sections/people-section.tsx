'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LocalizedLink as Link } from '@/components/localized-link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { resolveImageUrl } from '@/lib/image-url';

interface Person {
  id: string;
  name: string;
  nickname: string | null;
  slug: string | null;
  avatar_url: string | null;
  birthday: string | null;
  role_label: string | null;
  project_count: number;
  /** Portrait set by the curator in the admin; null until one is chosen. */
  image?: string | null;
}

/**
 * People & Archive Story.
 *
 * The two cards are picture doors, not text rows with a thumbnail: a portrait
 * frame with the name laid over it, the same way the year row works. The
 * portrait is `profiles.avatar_url`, set from the admin (gallery ->
 * milestones -> portraits). It is deliberately not derived from project
 * stills: a photo from a credited project was never the picture the card
 * wanted. Until one is picked the frame shows the person's initial.
 */
export function PeopleSection() {
  const { language } = useLanguage();
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/home/summary');
        if (!response.ok) return;
        const data = await response.json();
        setPeople(data.people ?? []);
      } catch (error) {
        console.error('[PEOPLE] failed to load:', error);
      }
    }
    load();
  }, []);

  if (people.length === 0) return null;

  return (
    <section className="relative py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10 md:mb-14 flex flex-wrap items-end justify-between gap-6"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'home.peopleTitle')}
              </span>
            </h2>
            <p className="text-ink-2 text-base md:text-lg font-light">
              {t(language, 'home.peopleSubtitle')}
            </p>
          </div>
          <Link
            href="/people"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-2 transition-colors hover:text-ink"
          >
            {t(language, 'nav.people')}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
          {people.map((person, index) => {
            const image = resolveImageUrl(person.image ?? person.avatar_url);
            const displayName = person.nickname || person.name;
            return (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <Link
                  href={`/people/${person.slug || person.id}`}
                  className="group block overflow-hidden rounded-xl border border-white/10"
                >
                  <div className="relative aspect-[4/5] sm:aspect-[3/4]">
                    {image ? (
                      <Image
                        src={image}
                        alt={displayName}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-lmsy-yellow/15 via-transparent to-lmsy-blue/15">
                        <span className="font-serif text-7xl font-bold text-white/15">
                          {displayName.slice(0, 1)}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                      <h3 className="hover-gradient-text font-serif text-3xl font-bold leading-tight text-white/95 md:text-4xl">
                        {displayName}
                      </h3>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                        {person.role_label || person.name}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-white/45">
                        {t(language, 'people.relatedProjects', { count: person.project_count })}
                        <ArrowRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
