/**
 * Milestones View Component
 *
 * Homepage timeline image management
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, Calendar } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { getCdnUrl, milestoneYearToApi } from '../../utils';
import { YEARS } from '../../constants';
import type { MilestoneImage } from '../../hooks/use-vault-data';
import type { GalleryItem } from '@/lib/supabase';

interface MilestonesViewProps {
  data: {
    milestones: Record<string, MilestoneImage>;
    gallery: GalleryItem[];
  };
  loading: boolean;
}

export function MilestonesView({ data, loading }: MilestonesViewProps) {
  const { milestones, gallery } = data;
  const [showModal, setShowModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [settingMilestone, setSettingMilestone] = useState(false);

  const openModal = (year: string) => {
    setSelectedYear(year);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedYear(null);
  };

  const setMilestone = async (imageId: string, year: string) => {
    setSettingMilestone(true);
    try {
      const apiYear = milestoneYearToApi(year);

      const response = await fetch('/api/admin/gallery/milestone', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, year: apiYear }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set milestone');
      }

      // Refresh data by calling the parent's refetch
      window.location.reload();
    } catch (err) {
      console.error('[SET_MILESTONE] Error:', err);
      alert('Failed to set milestone');
    } finally {
      setSettingMilestone(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="h-1.5 w-1.5 bg-lmsy-yellow/60 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border border-lmsy-yellow/20 rounded-lg p-4 bg-lmsy-yellow/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-lmsy-yellow" strokeWidth={1.5} />
          <h3 className="text-sm font-mono text-lmsy-yellow/90 tracking-wider">
            HOMEPAGE_MILESTONES
          </h3>
          <span className="text-xs font-mono text-white/30 ml-auto">
            SELECT_IMAGES_FOR_EACH_YEAR
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {YEARS.map((year) => {
            const milestone = milestones[year];
            const imageUrl = milestone ? getCdnUrl(milestone.image_url) : null;

            return (
              <motion.div
                key={year}
                className="relative aspect-[3/4] rounded border border-white/10 bg-black/50 overflow-hidden cursor-pointer group"
                whileHover={{ scale: 1.02, borderColor: 'rgba(251, 191, 36, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openModal(year)}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={`${year} milestone`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 150px"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Star className="h-6 w-6 text-white/10 mx-auto" strokeWidth={1.5} />
                      <span className="text-xs font-mono text-white/20">{year}</span>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2 text-center">
                    <span className="text-xs font-mono text-white/80 tracking-wider">
                      {imageUrl ? 'CHANGE_IMAGE' : 'SET_IMAGE'}
                    </span>
                  </div>
                </div>
                {milestone && (
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 bg-lmsy-yellow/20 border border-lmsy-yellow/40 text-lmsy-yellow/90 text-[10px] font-mono tracking-wider">
                      {year}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Milestone Selector Modal */}
      <AnimatePresence>
        {showModal && selectedYear && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-black border border-lmsy-yellow/30 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-serif text-xl text-lmsy-yellow/90 mb-1">
                      SET_MILESTONE_FOR_{selectedYear}
                    </h2>
                    <p className="text-xs font-mono text-white/40">
                      SELECT_AN_IMAGE_FROM_THE_VAULT_BELOW
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-3 p-2">
                  {gallery.map((item) => {
                    const imageUrl = getCdnUrl(item.image_url);
                    if (!imageUrl) return null;
                    const isCurrent = milestones[selectedYear]?.id === item.id;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => setMilestone(item.id, selectedYear)}
                        disabled={settingMilestone}
                        className={`relative aspect-[3/4] rounded overflow-hidden border-2 ${
                          isCurrent
                            ? 'border-lmsy-yellow shadow-lg shadow-lmsy-yellow/20'
                            : 'border-white/10 hover:border-white/30'
                        } transition-all`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Image
                          src={imageUrl}
                          alt={item.caption || 'Gallery image'}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 25vw, 200px"
                          unoptimized
                        />
                        {isCurrent && (
                          <div className="absolute top-2 left-2">
                            <Star className="h-5 w-5 text-lmsy-yellow fill-lmsy-yellow" strokeWidth={2} />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
