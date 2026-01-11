'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

interface PlatformLink {
  name: string;
  displayName: string;
  url: string;
  color: string;
}

interface MusicPlatformLinksProps {
  trackName?: string;
  platforms?: {
    spotify?: string;
    appleMusic?: string;
    youtubeMusic?: string;
    netEase?: string;
  };
  variant?: 'full' | 'minimal';
}

const defaultPlatforms: PlatformLink[] = [
  {
    name: 'spotify',
    displayName: 'SPOTIFY',
    url: 'https://open.spotify.com',
    color: '#1DB954',
  },
  {
    name: 'appleMusic',
    displayName: 'APPLE_MUSIC',
    url: 'https://music.apple.com',
    color: '#FA2D48',
  },
  {
    name: 'youtubeMusic',
    displayName: 'YOUTUBE_MUSIC',
    url: 'https://music.youtube.com',
    color: '#FF0000',
  },
  {
    name: 'netEase',
    displayName: 'NET_EASE',
    url: 'https://music.163.com',
    color: '#C20C0C',
  },
];

export function MusicPlatformLinks({
  trackName,
  platforms,
  variant = 'full',
}: MusicPlatformLinksProps) {
  const [showModal, setShowModal] = useState(false);

  // Merge custom platform URLs with defaults
  const platformLinks: PlatformLink[] = defaultPlatforms.map((defaultPlat) => ({
    ...defaultPlat,
    url: platforms?.[defaultPlat.name as keyof typeof platforms] || defaultPlat.url,
  }));

  if (variant === 'minimal') {
    // Minimal version: Show elegant links on profile pages
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Available On</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {platformLinks.map((platform, index) => (
            <motion.a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <span className="font-serif text-sm text-white/40 tracking-wider hover:text-white/70 transition-colors duration-300">
                {platform.displayName}
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white/20 group-hover:w-full transition-all duration-300" />
            </motion.a>
          ))}
        </div>
      </div>
    );
  }

  // Full version: Used in VinylPlayer modal
  return (
    <>
      {/* Support message trigger */}
      <div className="text-center mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.04)' }}>
        <motion.button
          onClick={() => setShowModal(true)}
          className="text-[9px] text-white/20 hover:text-white/40 transition-colors duration-300 font-serif tracking-wide"
          whileHover={{ scale: 1.02 }}
        >
          To hear the full resonance, support them on official platforms.
        </motion.button>
      </div>

      {/* Platform Modal */}
      {showModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            className="relative w-full max-w-md backdrop-blur-3xl rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
              <div>
                <p className="text-[10px] font-mono text-white/30 tracking-wider uppercase">Stream On</p>
                {trackName && <p className="font-serif text-sm text-white/60 mt-1">{trackName}</p>}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/60"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Platform Links */}
            <div className="p-6 space-y-2">
              {platformLinks.map((platform, index) => (
                <motion.a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  whileHover={{
                    borderColor: platform.color + '30',
                    background: platform.color + '10',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: platform.color }}
                    />
                    <span className="font-serif text-sm text-white/70 tracking-wide">
                      {platform.displayName.replace('_', ' ')}
                    </span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/30 group-hover:text-white/50 transition-colors" strokeWidth={1.5} />
                </motion.a>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 text-center" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
              <p className="text-[9px] font-mono text-white/20 tracking-wide">
                Support LMSY on your favorite platform
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
