'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

// Sample schedule data - will be replaced with Supabase data
const scheduleItems = [
  {
    id: '1',
    title: 'Fan Meet Bangkok',
    event_date: '2025-01-20T14:00:00',
    location: 'Siam Paragon, Bangkok',
    link: '#',
  },
  {
    id: '2',
    title: 'Affair Season 2 Premiere',
    event_date: '2025-02-14T19:00:00',
    location: 'SF World Cinema, Bangkok',
    link: '#',
  },
  {
    id: '3',
    title: 'Magazine Signing Event',
    event_date: '2025-03-01T13:00:00',
    location: 'Central World, Bangkok',
    link: '#',
  },
  {
    id: '4',
    title: 'TV Interview Special',
    event_date: '2025-03-15T10:00:00',
    location: 'Channel 3 Studio',
    link: '#',
  },
  {
    id: '5',
    title: 'Fashion Week Appearance',
    event_date: '2025-04-05T18:00:00',
    location: 'Bangkok Fashion Week',
    link: '#',
  },
];

// Past events
const pastEvents = [
  {
    id: '6',
    title: 'Year End Concert',
    event_date: '2024-12-31T20:00:00',
    location: 'Impact Arena, Bangkok',
    link: null,
  },
  {
    id: '7',
    title: 'Charity Event',
    event_date: '2024-12-15T10:00:00',
    location: 'Children\'s Hospital, Bangkok',
    link: null,
  },
];

const now = new Date();

function isEventPast(dateString: string): boolean {
  return new Date(dateString) < now;
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'th' ? 'th-TH' : locale === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString(locale === 'th' ? 'th-TH' : locale === 'zh' ? 'zh-CN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMonth(dateString: string, locale: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale === 'th' ? 'th-TH' : locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' });
}

export default function SchedulePage() {
  const { language } = useLanguage();
  const upcomingEvents = scheduleItems.filter(item => !isEventPast(item.event_date));
  const pastEventsSorted = [...pastEvents].sort((a, b) =>
    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
              {t(language, 'schedule.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t(language, 'schedule.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-3xl md:text-4xl mb-12"
          >
            {t(language, 'schedule.upcoming')}
          </motion.h2>

          {upcomingEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-muted-foreground">{t(language, 'schedule.noEvents')}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group overflow-hidden border border-border/50 magazine-shadow hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 md:p-8">
                        {/* Date Badge */}
                        <div className="flex sm:flex-col items-center gap-4 sm:gap-1 min-w-[100px]">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-primary flex flex-col items-center justify-center text-white">
                            <span className="text-xl sm:text-2xl font-bold">
                              {new Date(event.event_date).getDate()}
                            </span>
                            <span className="text-xs uppercase">
                              {formatMonth(event.event_date, language)}
                            </span>
                          </div>
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-2xl md:text-3xl mb-2 group-hover:text-primary transition-colors">
                            {event.title}
                          </h3>

                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">{formatDate(event.event_date, language)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{formatTime(event.event_date, language)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Link Button */}
                        {event.link && event.link !== '#' && (
                          <Link href={event.link} target="_blank">
                            <Button variant="outline" size="icon" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Past Events */}
      {pastEventsSorted.length > 0 && (
        <section className="pb-24 md:pb-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-serif text-3xl md:text-4xl mb-12"
            >
              {t(language, 'schedule.past')}
            </motion.h2>

            <div className="grid grid-cols-1 gap-6">
              {pastEventsSorted.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="opacity-50 hover:opacity-70 transition-opacity duration-300 border border-border/30">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 md:p-8">
                        {/* Date Badge */}
                        <div className="flex sm:flex-col items-center gap-4 sm:gap-1 min-w-[100px]">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm bg-muted flex flex-col items-center justify-center text-muted-foreground">
                            <span className="text-xl sm:text-2xl font-bold">
                              {new Date(event.event_date).getDate()}
                            </span>
                            <span className="text-xs uppercase">
                              {formatMonth(event.event_date, language)}
                            </span>
                          </div>
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-xl md:text-2xl mb-2">
                            {event.title}
                          </h3>

                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm">{formatDate(event.event_date, language)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{event.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
