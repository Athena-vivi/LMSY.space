'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface EditorialHeaderProps {
  title: string;
  description: string;
  eventDate: string;
  selectedProject: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export default function EditorialHeader({
  title,
  description,
  eventDate,
  selectedProject,
  onTitleChange,
  onDescriptionChange
}: EditorialHeaderProps) {
  // Auto-generate title based on event date and project
  const handleAutoGenerateTitle = () => {
    const dateMatch = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) {
      onTitleChange(`Archive_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_Visuals`);
      return;
    }

    const [, year, month, day] = dateMatch;
    const compactDate = `${year}${month}${day}`;

    // Get project category or default to 'Visuals'
    let category = 'Visuals';
    if (selectedProject) {
      // Could be enhanced to fetch project category from the projects array
      category = 'Featured';
    }

    const generatedTitle = `Archive_${compactDate}_${category}`;
    onTitleChange(generatedTitle);
  };

  return (
    <div className="space-y-5">
      {/* Title Input - Huge Serif */}
      <div className="space-y-2">
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Orbit"
            className="flex-1 w-full bg-transparent text-4xl md:text-5xl text-white placeholder-blue-200/20 focus:outline-none border-b transition-all duration-300 pr-12"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: '0.5px',
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontWeight: 400,
              lineHeight: '1.2',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'transparent';
              e.target.style.backgroundImage = 'linear-gradient(90deg, rgba(251, 191, 36, 0.6), rgba(56, 189, 248, 0.6))';
              e.target.style.backgroundSize = '100% 0.5px';
              e.target.style.backgroundPosition = 'bottom';
              e.target.style.backgroundRepeat = 'no-repeat';
              e.target.style.color = '#ffffff';
              e.target.style.textShadow = '0 0 20px rgba(251, 191, 36, 0.3), 0 0 40px rgba(56, 189, 248, 0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.target.style.backgroundImage = 'none';
              e.target.style.color = '#ffffff';
              e.target.style.textShadow = 'none';
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 group">
            <motion.button
              onClick={handleAutoGenerateTitle}
              className="opacity-70 hover:opacity-100 transition-opacity"
              whileHover={{
                scale: 1.1,
                filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.4))',
              }}
              whileTap={{ scale: 0.95 }}
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
              }}
            >
              <Image
                src="/lmsy-logo.png"
                alt="LMSY Logo"
                width={28}
                height={28}
                className="w-7 h-7"
                sizes="28px"
                priority
              />
            </motion.button>
            {/* Custom Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div
                className="whitespace-nowrap px-3 py-1.5 rounded text-[10px] font-mono tracking-wider uppercase border"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(56, 189, 248, 0.95))',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#000000',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(56, 189, 248, 0.3)',
                }}
              >
                Inspiration Source
              </div>
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-white/15 tracking-[0.3em] uppercase">
          Orbit Title
        </div>
      </div>

      {/* Curator's Statement - Description */}
      <div className="space-y-2">
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Write the narrative for this orbit..."
          rows={3}
          className="w-full bg-transparent text-sm text-white/70 placeholder-blue-200/20 focus:outline-none resize-none leading-relaxed transition-all duration-300 border-b"
          style={{
            lineHeight: '1.8',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: '0.5px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'transparent';
            e.target.style.backgroundImage = 'linear-gradient(90deg, rgba(56, 189, 248, 0.5), rgba(251, 191, 36, 0.5))';
            e.target.style.backgroundSize = '100% 0.5px';
            e.target.style.backgroundPosition = 'bottom';
            e.target.style.backgroundRepeat = 'no-repeat';
            e.target.style.color = '#ffffff';
            e.target.style.textShadow = '0 0 15px rgba(56, 189, 248, 0.2), 0 0 30px rgba(251, 191, 36, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.backgroundImage = 'none';
            e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            e.target.style.textShadow = 'none';
          }}
        />
        <div className="text-[9px] font-mono text-white/15 tracking-[0.3em] uppercase">
          Curator's Statement
        </div>
      </div>
    </div>
  );
}
