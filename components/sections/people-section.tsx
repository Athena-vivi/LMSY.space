'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';

interface Person {
  id: string;
  name: string;
  nickname: string | null;
  slug: string | null;
  avatar_url: string | null;
  birthday: string | null;
  role_label: string | null;
  project_count: number;
}

/**
 * People & Archive Story. The two cards read the same `profiles` rows that
 * /people and /people/[slug] read - one data source, three surfaces. The
 * archive story itself is the homepage_preface content block rendered by
 * MuseumPreface, so it is not duplicated here.
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
          className="mb-12 md:mb-16 flex flex-wrap items-end justify-between gap-6"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {people.map((person, index) => {
            const avatar = person.avatar_url ? getImageUrl(person.avatar_url) : null;
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
                  className="group flex items-center gap-5 rounded-xl border border-border bg-card/30 p-5 transition-colors hover:border-lmsy-blue/40 hover:bg-card/60"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    {avatar && (
                      <Image
                        src={avatar}
                        alt={person.nickname || person.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-2xl font-bold text-foreground transition-colors group-hover:text-lmsy-blue">
                      {person.nickname || person.name}
                    </h3>
                    <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                      {person.role_label || person.name}
                    </p>
                    <p className="mt-2 text-sm text-ink-2">
                      {t(language, 'people.relatedProjects')}: {person.project_count}
                    </p>
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
