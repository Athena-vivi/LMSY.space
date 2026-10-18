'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { getImageUrl } from '@/lib/image-url';
import { getLocalizedText } from '@/lib/localized-content';
import { categoryMeta } from '@/lib/category-meta';
import { formatDisplayDate } from '@/lib/display-date';

export interface PersonProject {
  id: string;
  slug: string | null;
  title: string;
  title_i18n: unknown;
  category: string | null;
  event_date: string | null;
  cover: string | null;
}

interface PersonProfile {
  id: string;
  name: string;
  nickname: string | null;
  slug: string | null;
  avatar_url: string | null;
  role_label: string | null;
  bio: string | null;
  bio_i18n: unknown;
  birthday: string | null;
  ig_handle: string | null;
  x_handle: string | null;
}

/**
 * Person detail. Everything on this page comes from `profiles` and
 * `project_people`; there is no hard-coded biography that can drift away from
 * the database.
 */
export default function PersonClient({
  profile,
  projects,
}: {
  profile: PersonProfile;
  projects: PersonProject[];
}) {
  const { language } = useLanguage();
  const avatar = profile.avatar_url ? getImageUrl(profile.avatar_url) : null;
  const displayName = profile.nickname || profile.name;
  const bio = getLocalizedText(profile.bio_i18n as never, language, profile.bio);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24 md:pt-20 md:pb-32">
        <header className="flex flex-col gap-8 sm:flex-row sm:items-center mb-16">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {avatar && (
              <Image
                src={avatar}
                alt={displayName}
                fill
                sizes="128px"
                className="object-cover"
                unoptimized
                priority
              />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-2">
              {profile.role_label || profile.name}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
              {profile.birthday && (
                <span>
                  {t(language, 'people.birthday')}: {profile.birthday}
                </span>
              )}
              {profile.ig_handle && (
                <a
                  href={`https://instagram.com/${profile.ig_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink transition-colors"
                >
                  IG @{profile.ig_handle}
                </a>
              )}
              {profile.x_handle && (
                <a
                  href={`https://x.com/${profile.x_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink transition-colors"
                >
                  X @{profile.x_handle}
                </a>
              )}
            </div>
          </div>
        </header>

        {bio && (
          <p className="max-w-3xl text-ink-2 text-lg leading-relaxed mb-16">{bio}</p>
        )}

        <section>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-8 text-foreground">
            {t(language, 'people.relatedProjects')}
          </h2>

          {projects.length === 0 ? (
            <p className="text-ink-2">{t(language, 'people.noProjects')}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {projects.map((project) => {
                const meta = categoryMeta(project.category);
                const title = getLocalizedText(project.title_i18n as never, language, project.title);
                const cover = project.cover ? getImageUrl(project.cover) : null;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug || project.id}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-card/40">
                      {cover && (
                        <Image
                          src={cover}
                          alt={title}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          unoptimized
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <span
                        className={`absolute top-3 left-3 inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur ${meta.accent}`}
                      >
                        {t(language, meta.labelKey)}
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-base font-semibold text-foreground transition-colors group-hover:text-lmsy-blue">
                      {title}
                    </h3>
                    {project.event_date && (
                      <time
                        dateTime={project.event_date}
                        className="mt-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2"
                      >
                        {formatDisplayDate(project.event_date, language)}
                      </time>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
