'use client';

import { useLanguage } from '@/components/language-provider';
import { PageIntro } from '@/components/page-intro';
import { ChronicleTimeline } from '@/components/chronicle-timeline';
import { t } from '@/lib/languages';
import type { ChronicleEvent } from '@/lib/timeline';

/**
 * /commercial presented in the timeline's visual language, minus the chronicle
 * sidebar.
 *
 * The wall mirrors the Timeline page's two-column alternating layout (each
 * card pairs its title with a few thumbnail pictures; the lightbox opens the
 * full set) but without the left "编年史" chrome - the year filter and the
 * meta rows belong to the chronicle, not to a brand-collaboration hall. The
 * heading keeps a page intro so the door still has a title of its own.
 */
export function CommercialTimeline({ events }: { events: ChronicleEvent[] }) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      <PageIntro
        title={t(language, 'category.commercial')}
        description={t(language, 'door.description.commercial')}
        meta={
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-2">
            {t(language, 'dramas.eventCount', { count: events.length })}
          </p>
        }
      />

      <section className="pb-24 md:pb-32">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14">
          <ChronicleTimeline events={events} activeYear={null} />
        </div>
      </section>
    </div>
  );
}
