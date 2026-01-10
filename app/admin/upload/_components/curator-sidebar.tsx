'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, PlusCircle } from 'lucide-react';
import type { Project, Member } from '@/lib/supabase/types';
import QuickProjectModal from './quick-project-modal';

interface CuratorSidebarProps {
  // Base Meta
  eventDate: string;
  onEventDateChange: (value: string) => void;
  selectedProject: string | null;
  onProjectChange: (value: string | null) => void;
  selectedMember: string | null;
  onMemberChange: (value: string | null) => void;
  projects: Project[];
  members: Member[];

  // Archive Data
  showBatchEditor: boolean;
  onToggleBatchEditor: () => void;
  batchCredits: string;
  onBatchCreditsChange: (value: string) => void;
  batchCatalogId: string;
  onBatchCatalogIdChange: (value: string) => void;
  batchMagazineIssue: string;
  onBatchMagazineIssueChange: (value: string) => void;

  // Archive Spec
  selectedTags: string[];
  onRemoveTag: (tag: string) => void;
  onAddTag: (tag: string) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;

  // Upload
  isUploading: boolean;
  uploadItemsCount: number;
  onUpload: () => void;

  // Quick Project Creation
  showProjectModal: boolean;
  onToggleProjectModal: () => void;
  onProjectCreated: (project: Project) => void;
}

const CURATOR_FAVORITE_TAGS = [
  'LMSY',
  'Affair',
  'Editorial',
  'Performance',
  'Portrait',
];

const MAX_TAGS = 8;

export default function CuratorSidebar({
  eventDate,
  onEventDateChange,
  selectedProject,
  onProjectChange,
  selectedMember,
  onMemberChange,
  projects,
  members,
  showBatchEditor,
  onToggleBatchEditor,
  batchCredits,
  onBatchCreditsChange,
  batchCatalogId,
  onBatchCatalogIdChange,
  batchMagazineIssue,
  onBatchMagazineIssueChange,
  selectedTags,
  onRemoveTag,
  onAddTag,
  tagInput,
  onTagInputChange,
  onTagInputKeyDown,
  isUploading,
  uploadItemsCount,
  onUpload,
  showProjectModal,
  onToggleProjectModal,
  onProjectCreated,
}: CuratorSidebarProps) {
  return (
    <div className="col-span-12 xl:col-span-2 space-y-4">
      {/* Group A: BASE_META */}
      <div className="space-y-3 pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
          Base Meta
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
            Event Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => onEventDateChange(e.target.value)}
            className="w-full px-0 py-1.5 bg-transparent text-white/70 font-mono text-xs focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors [color-scheme:dark]"
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
              Project
            </label>
            <motion.button
              onClick={onToggleProjectModal}
              className="text-lmsy-yellow/60 hover:text-lmsy-yellow/80 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <PlusCircle className="w-3.5 h-3.5" />
            </motion.button>
          </div>
          <motion.select
            value={selectedProject || ''}
            onChange={(e) => onProjectChange(e.target.value || null)}
            className="w-full px-0 py-1.5 bg-transparent text-white/70 font-mono text-xs focus:outline-none border-b focus:border-lmsy-blue/40 transition-colors appearance-none cursor-pointer"
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
            whileFocus={{ boxShadow: '0 0 10px rgba(56, 189, 248, 0.1)' }}
          >
            <option value="" className="bg-black">_UNLINKED</option>
            {projects.map(project => (
              <option key={project.id} value={project.id} className="bg-black">
                {project.title}
              </option>
            ))}
          </motion.select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
            Member
          </label>
          <motion.select
            value={selectedMember || ''}
            onChange={(e) => onMemberChange(e.target.value || null)}
            className="w-full px-0 py-1.5 bg-transparent text-white/70 font-mono text-xs focus:outline-none border-b focus:border-lmsy-blue/40 transition-colors appearance-none cursor-pointer"
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
            whileFocus={{ boxShadow: '0 0 10px rgba(56, 189, 248, 0.1)' }}
          >
            <option value="" className="bg-black">DUAL_RESONANCE (LMSY)</option>
            {members.map(member => (
              <option key={member.id} value={member.id} className="bg-black">
                {member.name}
              </option>
            ))}
          </motion.select>
        </div>
      </div>

      {/* Group B: ARCHIVE_DATA (Collapsible) */}
      <motion.div
        className="space-y-3 pb-4 border-b"
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <button
          onClick={onToggleBatchEditor}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
            Archive Data
          </div>
          <motion.div
            animate={{ rotate: showBatchEditor ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </button>

        <AnimatePresence>
          {showBatchEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-2"
            >
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-white/20 tracking-[0.2em] uppercase">
                  Credits
                </label>
                <input
                  type="text"
                  value={batchCredits}
                  onChange={(e) => onBatchCreditsChange(e.target.value)}
                  placeholder="Source: X / Weibo / Official"
                  className="w-full px-0 py-1.5 bg-transparent text-white/60 font-mono text-xs focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-white/15"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-white/20 tracking-[0.2em] uppercase">
                  Catalog ID Override
                </label>
                <input
                  type="text"
                  value={batchCatalogId}
                  onChange={(e) => onBatchCatalogIdChange(e.target.value)}
                  placeholder="LMSY-G-20250109-001"
                  className="w-full px-0 py-1.5 bg-transparent text-white/60 font-mono text-xs focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-white/15"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-white/20 tracking-[0.2em] uppercase">
                  Magazine Issue
                </label>
                <input
                  type="text"
                  value={batchMagazineIssue}
                  onChange={(e) => onBatchMagazineIssueChange(e.target.value)}
                  placeholder="Publication name and issue number"
                  className="w-full px-0 py-1.5 bg-transparent text-white/60 font-mono text-xs focus:outline-none border-b focus:border-lmsy-blue/40 transition-colors placeholder:text-white/15"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Group C: ARCHIVE_SPEC - Tags */}
      <div className="space-y-3 pb-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase">
            Archive Spec
          </label>
          <span className="text-[8px] font-mono" style={{ color: selectedTags.length >= MAX_TAGS ? 'rgba(239, 68, 68, 0.7)' : 'rgba(255, 255, 255, 0.2)' }}>
            {selectedTags.length} / {MAX_TAGS}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag, index) => (
            <motion.span
              key={tag}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border cursor-pointer transition-all"
              style={{
                borderColor: index % 2 === 0 ? 'rgba(251, 191, 36, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: index % 2 === 0 ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.7)',
              }}
              whileHover={{
                borderColor: index % 2 === 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(56, 189, 248, 0.3)',
                color: index % 2 === 0 ? 'rgba(251, 191, 36, 0.9)' : 'rgba(56, 189, 248, 0.9)',
              }}
            >
              {tag}
              <button
                onClick={() => onRemoveTag(tag)}
                className="hover:text-white/60 ml-0.5"
              >
                <X className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </motion.span>
          ))}
        </div>

        <input
          type="text"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={onTagInputKeyDown}
          placeholder={selectedTags.length >= MAX_TAGS ? "Maximum tags reached" : "+ Add tag"}
          disabled={selectedTags.length >= MAX_TAGS}
          className="w-full px-0 py-1.5 bg-transparent text-white/40 font-mono text-xs focus:outline-none border-b focus:border-lmsy-yellow/40 transition-colors placeholder:text-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
        />

        {/* Curator's Favorite Tags */}
        <div className="pt-2">
          <div className="text-[8px] font-mono text-white/15 tracking-wider uppercase mb-2">
            Quick Add
          </div>
          <div className="flex flex-wrap gap-1">
            {CURATOR_FAVORITE_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              const isDisabled = isSelected || selectedTags.length >= MAX_TAGS;
              return (
                <motion.button
                  key={tag}
                  onClick={() => !isDisabled && onAddTag(tag)}
                  disabled={isDisabled}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono border transition-all ${
                    isSelected
                      ? 'bg-white/10 cursor-default'
                      : isDisabled
                      ? 'opacity-20 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  style={{
                    borderColor: isSelected
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'rgba(251, 191, 36, 0.1)',
                    color: isSelected
                      ? 'rgba(255, 255, 255, 0.4)'
                      : 'rgba(251, 191, 36, 0.5)',
                  }}
                  whileHover={!isDisabled ? {
                    borderColor: 'rgba(251, 191, 36, 0.3)',
                    color: 'rgba(251, 191, 36, 0.8)',
                    scale: 1.02,
                  } : {}}
                  whileTap={!isDisabled ? { scale: 0.98 } : {}}
                >
                  #{tag}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <motion.button
        onClick={onUpload}
        disabled={isUploading || uploadItemsCount === 0}
        className="w-full h-10 rounded border font-mono text-xs tracking-wider transition-all duration-300 relative overflow-hidden"
        style={{
          borderColor: uploadItemsCount > 0 && !isUploading ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.1)',
          color: uploadItemsCount > 0 && !isUploading ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.3)',
          backgroundColor: 'transparent',
          textShadow: uploadItemsCount > 0 && !isUploading ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none',
          cursor: uploadItemsCount > 0 && !isUploading ? 'pointer' : 'not-allowed',
        }}
        whileHover={uploadItemsCount > 0 && !isUploading ? {
          borderColor: 'rgba(251, 191, 36, 0.7)',
          textShadow: '0 0 15px rgba(251, 191, 36, 0.8)',
        } : {}}
        whileTap={uploadItemsCount > 0 && !isUploading ? { scale: 0.98 } : {}}
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            SYNCING...
          </span>
        ) : (
          `UPLOAD ALL (${uploadItemsCount})`
        )}
      </motion.button>

      {/* Quick Project Modal */}
      <QuickProjectModal
        isOpen={showProjectModal}
        onClose={onToggleProjectModal}
        onProjectCreated={onProjectCreated}
      />
    </div>
  );
}
