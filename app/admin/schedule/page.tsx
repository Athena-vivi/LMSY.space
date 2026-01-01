'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Plus, Calendar as CalendarIcon, MapPin, ExternalLink } from 'lucide-react';
import { supabase, type Schedule } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function AdminSchedulePage() {
  const [events, setEvents] = useState<Schedule[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .order('event_date', { ascending: true });

    if (!error && data) setEvents(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    const { error } = await supabase.from('schedule').delete().eq('id', id);
    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = events.filter(e => new Date(e.event_date) < new Date());

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
            Schedule Management
          </h1>
          <p className="text-muted-foreground">
            Manage upcoming events, fan meetings, and appearances
          </p>
        </div>
        <Button className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      {/* Upcoming Events */}
      <div className="mb-12">
        <h2 className="font-serif text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-lmsy-yellow" />
          Upcoming Events ({upcomingEvents.length})
        </h2>

        <div className="space-y-4">
          {upcomingEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group border-2 border-border rounded-lg p-6 hover:border-lmsy-blue/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="px-4 py-2 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue rounded-lg">
                      <div className="text-center">
                        <div className="text-xs font-bold text-foreground">
                          {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {new Date(event.event_date).getDate()}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-foreground">
                        {event.title}
                      </h3>
                      {event.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white/90 rounded-lg hover:bg-white border">
                    <Edit2 className="h-4 w-4 text-foreground" />
                  </button>
                  {event.link && (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/90 rounded-lg hover:bg-white border"
                    >
                      <ExternalLink className="h-4 w-4 text-foreground" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 bg-red-500 rounded-lg hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {upcomingEvents.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No upcoming events scheduled</p>
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-muted-foreground" />
            Past Events ({pastEvents.length})
          </h2>

          <div className="space-y-4 opacity-60">
            {pastEvents.map((event) => (
              <div
                key={event.id}
                className="border-2 border-border rounded-lg p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold text-muted-foreground">
                        {new Date(event.event_date).getDate()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-muted-foreground">{event.title}</h3>
                    {event.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
