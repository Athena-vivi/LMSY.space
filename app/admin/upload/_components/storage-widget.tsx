'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Database, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface StorageUsage {
  totalBytes: number;
  totalGB: string;
  totalFormatted: string;
  usedPercent: string;
  limitGB: number;
  remainingBytes: number;
  remainingGB: number;
  remainingFormatted: string;
  objectCount: number;
  breakdown: Array<{
    prefix: string;
    count: number;
    size: string;
    sizeBytes: number;
  }>;
}

interface StorageWidgetProps {
  className?: string;
}

export default function StorageWidget({ className = '' }: StorageWidgetProps) {
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorage = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/storage', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch storage info');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      setStorage(result.usage);
    } catch (err) {
      console.error('Storage fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load storage info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
  }, []);

  if (loading) {
    return (
      <div className={`p-3 border rounded bg-black/40 ${className}`} style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3 h-3 text-white/20 animate-spin" />
          <span className="text-[8px] font-mono text-white/30">LOADING_STORAGE_METRICS...</span>
        </div>
      </div>
    );
  }

  if (error || !storage) {
    return (
      <div className={`p-3 border rounded bg-black/40 ${className}`} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        <div className="flex items-center gap-2">
          <HardDrive className="w-3 h-3 text-red-400/50" />
          <span className="text-[8px] font-mono text-red-400/50">STORAGE_UNAVAILABLE</span>
        </div>
      </div>
    );
  }

  const usedPercent = parseFloat(storage.usedPercent);
  const isNearLimit = usedPercent > 80;
  const isWarning = usedPercent > 60;

  const barColor = isNearLimit
    ? 'rgba(239, 68, 68, 0.8)'
    : isWarning
    ? 'rgba(251, 191, 36, 0.8)'
    : 'rgba(56, 189, 248, 0.8)';

  const textColor = isNearLimit
    ? 'text-red-400/80'
    : isWarning
    ? 'text-lmsy-yellow/80'
    : 'text-lmsy-blue/80';

  return (
    <div className={`p-3 border rounded bg-black/40 space-y-2 ${className}`} style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3 h-3" style={{ color: barColor }} />
          <span className="text-[9px] font-mono text-white/40 tracking-wider uppercase">
            R2_STORAGE
          </span>
        </div>
        <button
          onClick={fetchStorage}
          className="p-0.5 hover:bg-white/5 rounded transition-colors"
          title="Refresh storage info"
        >
          <RefreshCw className="w-2.5 h-2.5 text-white/20 hover:text-white/40 transition-colors" />
        </button>
      </div>

      {/* Usage Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[8px] font-mono">
          <span className={textColor}>{storage.usedPercent}%</span>
          <span className="text-white/30">{storage.totalFormatted} / {storage.limitGB} GB</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usedPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
        <div className="text-[7px] font-mono text-white/20 text-center">
          {storage.remainingFormatted} REMAINING
        </div>
      </div>

      {/* Object Count */}
      <div className="pt-1 border-t border-white/5 flex items-center justify-between">
        <span className="text-[7px] font-mono text-white/20 uppercase">Total Artifacts</span>
        <span className="text-[8px] font-mono text-white/40">{storage.objectCount} FILES</span>
      </div>

      {/* Breakdown (hover to show) */}
      {storage.breakdown.length > 0 && (
        <div className="pt-1 space-y-0.5">
          {storage.breakdown.slice(0, 3).map((item) => (
            <div key={item.prefix} className="flex items-center justify-between text-[7px] font-mono">
              <span className="text-white/15">{item.prefix}</span>
              <span className="text-white/25">{item.count} · {item.size}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
