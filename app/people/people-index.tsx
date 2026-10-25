import Link from 'next/link';
import Image from 'next/image';
import { getSupabasePublic } from '@/lib/data/client';
import { listPublicProjectIds } from '@/lib/data/projects';
import { getImageUrl } from '@/lib/image-url';
import { t, type Language } from '@/lib/languages';

/**
 * People index body, shared by /people (English) and /<lang>/people (i18n
 * routing plan step 2). This is a server component, so it cannot read the
 * LanguageProvider - the route passes the language in explicitly and `t()`
 * renders the right strings in the SSR HTML.
 */
export async function PeopleIndex({ language }: { language: Language }) {
  const supabase = getSupabasePublic();

  const { data: profiles } = await supabase
    .schema('lmsy_archive')
    .from('profiles')
    .select('id, name, nickname, slug, avatar_url, role_label, bio, birthday, ig_handle, x_handle')
    .order('nickname', { ascending: true });

  const publicIdList = await listPublicProjectIds(supabase);
  const publicIds = new Set(publicIdList);

  const { data: links } = await supabase
    .schema('lmsy_archive')
    .from('project_people')
    .select('profile_id, project_id');

  const countByProfile: Record<string, number> = {};
  for (const link of links ?? []) {
    const row = link as { profile_id: string; project_id: string };
    if (!publicIds.has(row.project_id)) continue;
    countByProfile[row.profile_id] = (countByProfile[row.profile_id] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-24 md:pt-20 md:pb-32">
        <header className="mb-14 md:mb-20">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
              {t(language, 'people.title')}
            </span>
          </h1>
          <p className="text-ink-2 text-lg md:text-xl font-light">
            {t(language, 'people.description')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {(profiles ?? []).map((profile) => {
            const person = profile as {
              id: string;
              name: string;
              nickname: string | null;
              slug: string | null;
              avatar_url: string | null;
              role_label: string | null;
              birthday: string | null;
            };
            const avatar = person.avatar_url ? getImageUrl(person.avatar_url) : null;
            const count = countByProfile[person.id] ?? 0;

            return (
              <Link
                key={person.id}
                href={`/people/${person.slug || person.id}`}
                className="group flex items-center gap-6 rounded-2xl border border-border bg-card/30 p-6 transition-colors hover:border-lmsy-blue/40 hover:bg-card/60"
              >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {avatar && (
                    <Image
                      src={avatar}
                      alt={person.nickname || person.name}
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      unoptimized
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-3xl font-bold text-foreground transition-colors group-hover:text-lmsy-blue">
                    {person.nickname || person.name}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
                    {person.role_label || person.name}
                  </p>
                  <p className="mt-3 font-mono text-[10px] tracking-[0.16em] text-ink-2">
                    {t(language, 'people.relatedProjects', { count })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
