'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { ProjectCategory } from '@/lib/supabase/types';

interface CategoryOption {
  value: ProjectCategory;
  label: string;
  prefix: string;
}

interface CategoryDropdownProps {
  options: CategoryOption[];
  value: ProjectCategory;
  onChange: (value: ProjectCategory) => void;
}

export default function CategoryDropdown({ options, value, onChange }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-0 py-2 bg-transparent text-left text-white/70 font-mono text-sm focus:outline-none border-b focus:border-lmsy-blue/40 transition-colors appearance-none cursor-pointer relative z-10 flex items-center justify-between"
        style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        whileFocus={{
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)',
        }}
      >
        <span>{selectedOption?.label || 'Select category...'}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/30" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.95, y: -10 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute z-50 w-full mt-2 rounded-lg overflow-hidden"
            style={{
              backgroundColor: 'rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
              transformOrigin: 'top center',
            }}
          >
            {/* 🔒 INVISIBLE SCROLL: max-h with no-scrollbar class */}
            <div className="max-h-[280px] overflow-y-auto no-scrollbar relative">
              {/* Option List */}
              <div className="py-1">
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left font-mono text-xs flex items-center gap-3 relative transition-all duration-150 whitespace-nowrap"
                      style={{
                        color: isSelected ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0)',
                      }}
                      whileHover={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(251, 191, 36, 0.9)',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Selection Indicator */}
                      <motion.div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.9), rgba(56, 189, 248, 0.9))',
                        }}
                        initial={isSelected ? { height: '16px' } : { height: '0px' }}
                        animate={{
                          height: isSelected ? '16px' : '0px',
                        }}
                        transition={{ duration: 0.2 }}
                      />
                      <span className="flex-1">{option.label}</span>
                      {/* Prefix Badge */}
                      <span
                        className="text-[9px] px-2 py-0.5 rounded border opacity-60 flex-shrink-0"
                        style={{
                          borderColor: isSelected ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                          color: isSelected ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        {option.prefix}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* 🌌 GRADIENT FADE HINT: Suggests more content below */}
              {options.length > 5 && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, rgba(10, 10, 10, 0.95) 0%, rgba(10, 10, 10, 0) 100%)',
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nebula glow effect on trigger */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: isOpen ? [0, 0.3, 0] : [0, 0.1, 0],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: isOpen ? 1 : Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
        }}
      />
    </div>
  );
}
