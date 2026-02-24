/**
 * Chronicle View Component
 *
 * Timeline event management
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Calendar, Edit2, Trash2, ChevronDown, ChevronUp, Loader2, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { getCdnUrl, groupEventsByYear, formatShortDate } from '../../utils';
import type { ChronicleEvent } from '../../hooks/use-vault-data';
import type { GalleryItem } from '@/lib/supabase';

interface ChronicleViewProps {
  data: {
    events: ChronicleEvent[];
    gallery: GalleryItem[];
  };
  loading: boolean;
}

export function ChronicleView({ data, loading }: ChronicleViewProps) {
  const { events, gallery } = data;
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    event_type: 'custom' as 'gallery' | 'project' | 'custom',
  });
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/chronicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          event_date: newEvent.event_date,
          event_type: newEvent.event_type,
          image_ids: Array.from(selectedImages),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      // Reload page to show new event
      window.location.reload();
    } catch (error) {
      console.error('[CHRONICLE] Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/admin/chronicle?id=${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      // Reload page
      window.location.reload();
    } catch (error) {
      console.error('[CHRONICLE] Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const getEventImages = (imageIds: string[]) => {
    return gallery.filter(item => imageIds.includes(item.id));
  };

  const groupedEvents = groupEventsByYear(events);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-lmsy-yellow/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <motion.button
          onClick={() => setShowAddEvent(!showAddEvent)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 font-mono text-xs tracking-wider"
          style={{
            borderColor: 'rgba(251, 191, 36, 0.3)',
            backgroundColor: 'rgba(251, 191, 36, 0.05)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="h-4 w-4 text-lmsy-yellow/80" strokeWidth={1.5} />
          <span className="text-lmsy-yellow/80">NEW EVENT</span>
        </motion.button>
      </div>

      {/* Add Event Form */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border rounded-lg p-6"
            style={{
              borderColor: 'rgba(251, 191, 36, 0.2)',
              backgroundColor: 'rgba(251, 191, 36, 0.02)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., Christmas Photoshoot 2024"
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                  Date
                </label>
                <input
                  type="date"
                  value={newEvent.event_date}
                  onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors [color-scheme:dark]"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                Description
              </label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event description..."
                rows={2}
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors resize-none"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              />
            </div>

            {/* Image Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-white/30 tracking-wider uppercase flex items-center gap-2">
                  <ImageIcon className="h-3 w-3" />
                  Link Images ({selectedImages.size})
                </label>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border rounded-lg"
                   style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
                {gallery.map((item) => {
                  const imageUrl = getCdnUrl(item.image_url);
                  if (!imageUrl) return null;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleImageSelection(item.id)}
                      className="relative aspect-square rounded cursor-pointer border overflow-hidden transition-all duration-200"
                      style={{
                        borderColor: selectedImages.has(item.id)
                          ? 'rgba(251, 191, 36, 0.6)'
                          : 'rgba(255, 255, 255, 0.08)',
                        boxShadow: selectedImages.has(item.id)
                          ? '0 0 15px rgba(251, 191, 36, 0.2)'
                          : 'none',
                      }}
                    >
                      <Image
                        src={imageUrl}
                        alt={item.caption || 'Gallery image'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 100px) 100vw"
                        unoptimized
                      />
                      {selectedImages.has(item.id) && (
                        <div className="absolute inset-0 bg-lmsy-yellow/20 flex items-center justify-center">
                          <div className="w-4 h-0.5 bg-black" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t"
                 style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
              <button
                onClick={() => setShowAddEvent(false)}
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                onClick={handleSaveEvent}
                disabled={!newEvent.title || isSaving}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-mono text-xs tracking-wider transition-all duration-300"
                style={{
                  background: newEvent.title
                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.8), rgba(56, 189, 248, 0.8))'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: newEvent.title ? '#000' : 'rgba(255, 255, 255, 0.2)',
                  cursor: newEvent.title ? 'pointer' : 'not-allowed',
                }}
                whileHover={newEvent.title ? { scale: 1.05 } : {}}
                whileTap={newEvent.title ? { scale: 0.95 } : {}}
              >
                {isSaving ? 'Saving...' : 'SAVE EVENT'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="h-12 w-12 text-white/10 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-white/30 text-sm">No events yet. Create your first chronicle entry.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedEvents)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, yearEvents]) => (
              <div key={year}>
                {/* Year Header */}
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="font-serif text-5xl font-light text-white/20">
                    {year}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-lmsy-yellow/30 to-transparent" />
                </div>

                {/* Events */}
                <div className="space-y-4">
                  {yearEvents
                    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
                    .map((event) => {
                      const isExpanded = expandedEvents.has(event.id);
                      const eventImages = getEventImages(event.image_ids || []);

                      return (
                        <motion.div
                          key={event.id}
                          className="border rounded-lg overflow-hidden"
                          style={{
                            borderColor: 'rgba(255, 255, 255, 0.05)',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                          }}
                        >
                          {/* Event Header */}
                          <div
                            className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                            onClick={() => toggleEventExpansion(event.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="text-[10px] font-mono text-white/30">
                                    {formatShortDate(event.event_date)}
                                  </div>
                                  <h3 className="font-serif text-xl text-white/80">
                                    {event.title}
                                  </h3>
                                </div>
                                <p className="text-sm text-white/40 line-clamp-2">
                                  {event.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-[10px] font-mono text-lmsy-yellow/60 px-2 py-1 rounded border"
                                     style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                                  {event.image_ids?.length || 0} images
                                </div>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-white/30" strokeWidth={1.5} />
                                </motion.div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-t p-4"
                                style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
                              >
                                {/* Images Grid */}
                                {eventImages.length > 0 && (
                                  <div className="mb-4">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                      {eventImages.map((image) => {
                                        const imageUrl = getCdnUrl(image.image_url);
                                        if (!imageUrl) return null;
                                        return (
                                          <div
                                            key={image.id}
                                            className="relative aspect-square rounded overflow-hidden border"
                                            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                          >
                                            <Image
                                              src={imageUrl}
                                              alt={image.caption || 'Event image'}
                                              fill
                                              className="object-cover"
                                              sizes="(max-width: 100px) 100vw"
                                              unoptimized
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2">
                                  <motion.button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs transition-colors text-white/40 hover:text-red-400 hover:bg-red-500/5"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Trash2 className="h-3 w-3" strokeWidth={2} />
                                    Delete
                                  </motion.button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
