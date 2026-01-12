'use client';

import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import Image from 'next/image';

// 🔒 INGESTION MONITOR: Upload status tracking for absolute transparency
export type UploadStep = 'pending' | 'converting' | 'r2_upload' | 'db_register' | 'success' | 'error';

export interface UploadStatus {
  id: string;
  fileName: string;
  preview: string;
  status: UploadStep;
  currentStep: string;
  error?: string;
  progress: number;
}

export interface IngestionMonitorState {
  visible: boolean;
  items: UploadStatus[];
  currentIndex: number;
  total: number;
  completed: number;
  failed: boolean;
  globalError?: string;
}

interface IngestionMonitorProps {
  state: IngestionMonitorState;
  onClose: () => void;
  onRetry: () => void;
}

/**
 * 🔒 INGESTION MONITOR COMPONENT
 *
 * Immersive Upload Progress Panel
 *
 * Pure presenter component - receives data via props, renders UI only.
 * No business logic, no side effects.
 *
 * Features:
 * - Full-screen overlay with backdrop blur
 * - Real-time progress tracking per file
 * - Lifecycle checklist (WebP → R2 → Database)
 * - Digital pulse progress bar (flashing blocks)
 * - Automatic failure detection and retry
 * - Visual effects: Yellow/Blue glow, animations
 */
export default function IngestionMonitor({
  state,
  onClose,
  onRetry,
}: IngestionMonitorProps) {
  const currentItem = state.items[state.currentIndex];

  // Calculate progress percentage
  const progress = state.total > 0 ? (state.completed / state.total) * 100 : 0;

  // Check if all complete
  const allComplete = state.completed === state.total && state.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="w-full max-w-6xl mx-auto px-6">
        {/* Header: SYNCHRONIZING_ORBIT... */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white/90 mb-4">
            {allComplete ? (
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                ARCHIVE_SYNC_SUCCESSFUL
              </span>
            ) : (
              <>
                <span className="text-lmsy-yellow/80">SYNCHRONIZING</span>
                <span className="text-white/50">_</span>
                <span className="text-lmsy-blue/80">ORBIT</span>
                <span className="animate-pulse">...</span>
              </>
            )}
          </h1>
          <p className="font-mono text-xs text-white/30 tracking-[0.3em]">
            INGESTION_MONITOR_v1.0 :: ABSOLUTE_TRANSPARENCY
          </p>
        </motion.div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Current Image Thumbnail */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-amber-950/20">
              {currentItem && currentItem.preview ? (
                <Image
                  src={currentItem.preview}
                  alt={currentItem.fileName || 'Processing...'}
                  fill
                  className="object-cover"
                  unoptimized
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmNTlmMTYiIG9wYWNpdHk9IjAuMiIvPjwvc3ZnPg=="
                />
              ) : allComplete ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">✨</div>
                    <p className="font-mono text-sm text-lmsy-yellow/60">
                      ALL_ARTIFACTS_PRESERVED
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse">
                    <div className="w-16 h-16 border-4 border-lmsy-yellow/20 border-t-lmsy-yellow rounded-full animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Current File Name */}
            {currentItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center"
              >
                <p className="font-mono text-sm text-white/60 break-all">
                  {currentItem.fileName}
                </p>
                <p className="font-mono text-xs text-white/30 mt-1">
                  [{state.currentIndex + 1} / {state.total}]
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Right: Lifecycle Checklist */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase mb-6">
              Lifecycle_Checklist
            </h3>

            {/* Steps */}
            {[
              { key: 'converting', label: 'WebP Conversion', icon: '🔄' },
              { key: 'r2_upload', label: 'R2 Upload', icon: '☁️' },
              { key: 'db_register', label: 'Database Record', icon: '💾' },
            ].map((step) => {
              const isActive = currentItem?.status === step.key;
              const isComplete = currentItem?.status === 'success' ||
                               (state.items.some(item => item.status === 'success'));
              const isPending = currentItem?.status === 'pending' && step.key !== 'pending';

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (step.key === 'converting' ? 0 : step.key === 'r2_upload' ? 0.1 : 0.2) }}
                  className={`
                    p-4 rounded-lg border transition-all duration-300
                    ${isActive
                      ? 'border-lmsy-yellow/40 bg-lmsy-yellow/5 shadow-lg shadow-lmsy-yellow/10'
                      : isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register')
                      ? 'border-lmsy-blue/20 bg-lmsy-blue/5'
                      : 'border-white/5 bg-white/[0.02]'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`
                      text-2xl transition-all duration-300
                      ${isActive ? 'animate-spin' : ''}
                      ${isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register') ? 'opacity-100' : 'opacity-30'}
                    `}>
                      {isActive ? '⚙️' : isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register') ? '✅' : step.icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1">
                      <p className={`font-mono text-sm ${
                        isActive ? 'text-lmsy-yellow/80' : isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register') ? 'text-lmsy-blue/60' : 'text-white/40'
                      }`}>
                        {step.label}
                      </p>
                      {isActive && currentItem?.currentStep && (
                        <p className="font-mono text-xs text-white/30 mt-1">
                          {currentItem.currentStep}
                        </p>
                      )}
                    </div>

                    {/* Status Indicator */}
                    {isActive && (
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-lmsy-yellow"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Error Display */}
            {state.failed && state.globalError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border-2 border-red-500/40 bg-red-950/20"
              >
                <p className="font-mono text-xs text-red-400/60 uppercase mb-2">ERROR_DETECTED</p>
                <p className="font-mono text-sm text-red-300 break-all">
                  {state.globalError}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Digital Pulse Progress Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-1">
            {state.items.map((item, index) => {
              const isComplete = item.status === 'success';
              const isCurrent = index === state.currentIndex;
              const isError = item.status === 'error';

              return (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`
                    w-2 h-8 rounded-sm transition-all duration-500
                    ${isComplete
                      ? 'bg-gradient-to-t from-lmsy-yellow to-lmsy-blue shadow-lg shadow-lmsy-yellow/30'
                      : isCurrent
                      ? 'bg-lmsy-yellow/60 animate-pulse'
                      : isError
                      ? 'bg-red-500/60'
                      : 'bg-white/5'
                    }
                  `}
                />
              );
            })}
          </div>

          {/* Progress Text */}
          <div className="text-center mt-4">
            <p className="font-mono text-xs text-white/40">
              {state.completed} / {state.total} ARTIFACTS{' '}
              <span className="text-lmsy-yellow/60">
                {progress.toFixed(0)}%
              </span>
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-4"
        >
          {/* Close Button (only when not failed) */}
          {!state.failed && (
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="font-mono text-sm text-white/60">
                [ CLOSE ]
              </span>
            </button>
          )}

          {/* Retry Button (only when failed) */}
          {state.failed && (
            <button
              onClick={onRetry}
              className="flex items-center gap-3 px-8 py-3 rounded-lg border border-red-500/40 bg-red-950/20 hover:bg-red-950/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span className="font-mono text-sm text-red-400">
                [ RETRY_SIGNAL ]
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
