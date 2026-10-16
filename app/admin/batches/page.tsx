'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Layers, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BatchRow {
  batchId: string;
  total: number;
  ready: number;
  failed: number;
  linked: number;
  unlinked: number;
  firstSeen: string;
  lastSeen: string;
  sampleAccount: string | null;
}

interface LooseRow {
  total: number;
  linked: number;
}

/**
 * Batch records view: aggregates draft_items by batch_id so curators can
 * review what each ingestion run produced and jump into the draft inbox
 * pre-filtered for that batch.
 */
export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loose, setLoose] = useState<LooseRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .schema('lmsy_archive')
      .from('draft_items')
      .select('batch_id, ingestion_stage, project_id, source_account, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const map = new Map<string, BatchRow>();
      let looseRow: LooseRow = { total: 0, linked: 0 };
      for (const d of data) {
        if (!d.batch_id) {
          looseRow.total += 1;
          if (d.project_id) looseRow.linked += 1;
          continue;
        }
        let row = map.get(d.batch_id);
        if (!row) {
          row = {
            batchId: d.batch_id,
            total: 0,
            ready: 0,
            failed: 0,
            linked: 0,
            unlinked: 0,
            firstSeen: d.created_at,
            lastSeen: d.created_at,
            sampleAccount: null,
          };
          map.set(d.batch_id, row);
        }
        row.total += 1;
        if (d.ingestion_stage === 'ready' || !d.ingestion_stage) row.ready += 1;
        else row.failed += 1;
        if (d.project_id) row.linked += 1;
        else row.unlinked += 1;
        if (d.created_at < row.firstSeen) row.firstSeen = d.created_at;
        if (d.created_at > row.lastSeen) row.lastSeen = d.created_at;
        if (!row.sampleAccount && d.source_account) row.sampleAccount = d.source_account;
      }
      setBatches(Array.from(map.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)));
      setLoose(looseRow);
    }
    setLoading(false);
  };

  const totalInBatches = useMemo(() => batches.reduce((s, b) => s + b.total, 0), [batches]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-light text-white/90 tracking-tight">INGEST BATCHES</h1>
          <p className="text-xs font-mono text-white/30 tracking-wider">
            {batches.length} BATCHES · {totalInBatches} ITEMS IN BATCHES
            {loose ? ` · ${loose.total} WITHOUT BATCH` : ''}
          </p>
        </div>
        <Link
          href="/admin/drafts"
          className="border border-white/10 px-4 py-2 text-xs font-mono text-white/50 transition-colors hover:border-lmsy-blue/30 hover:text-lmsy-blue/80"
        >
          OPEN_DRAFT_INBOX
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-lmsy-yellow/60" />
        </div>
      ) : batches.length === 0 ? (
        <div className="border px-4 py-16 text-center text-xs font-mono tracking-wider text-white/25"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          NO_BATCHES_RECORDED
        </div>
      ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b text-xs font-mono font-medium tracking-wider"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="col-span-3 text-white/40">BATCH_ID</div>
            <div className="col-span-2 text-white/40">WINDOW (UTC)</div>
            <div className="col-span-2 text-white/40">ITEMS</div>
            <div className="col-span-2 text-white/40">ASSIGNED</div>
            <div className="col-span-2 text-white/40">SOURCE</div>
            <div className="col-span-1 text-white/40 text-right">ACTIONS</div>
          </div>

          {batches.map((b, index) => (
            <motion.div
              key={b.batchId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.4) }}
              className="grid grid-cols-12 gap-3 px-4 py-3 border text-xs font-light items-center hover:bg-white/[0.02] transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <div className="col-span-3 font-mono text-white/80 truncate" title={b.batchId}>
                <Layers className="mr-2 inline h-3 w-3 text-lmsy-yellow/60" strokeWidth={1.5} />
                {b.batchId}
              </div>
              <div className="col-span-2 font-mono text-[10px] text-white/40">
                {b.firstSeen.slice(0, 16)} →<br />{b.lastSeen.slice(0, 16)}
              </div>
              <div className="col-span-2 font-mono">
                <span className="text-white/80">{b.total}</span>
                {b.failed > 0 && <span className="ml-2 text-red-400/70">{b.failed} FAIL</span>}
              </div>
              <div className="col-span-2 font-mono">
                <span className={b.unlinked > 0 ? 'text-lmsy-yellow/80' : 'text-green-300/70'}>
                  {b.linked}/{b.total}
                </span>
                {b.unlinked > 0 && <span className="ml-2 text-white/30">{b.unlinked} ungrouped</span>}
              </div>
              <div className="col-span-2 font-mono text-[10px] text-white/40 truncate">
                {b.sampleAccount || '—'}
              </div>
              <div className="col-span-1 flex justify-end">
                <Link
                  href={`/admin/drafts?batch_id=${encodeURIComponent(b.batchId)}`}
                  className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-[10px] font-mono tracking-widest text-white/50 transition-colors hover:border-lmsy-yellow/30 hover:text-lmsy-yellow/80"
                >
                  REVIEW
                  <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                </Link>
              </div>
            </motion.div>
          ))}

          {loose && loose.total > 0 && (
            <div className="mt-4 flex items-center justify-between border px-4 py-3 text-xs font-mono text-white/40"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <span>
                {loose.total} items without a batch id (webhook / manual) · {loose.linked} assigned to projects
              </span>
              <Link href="/admin/drafts" className="text-lmsy-blue/70 hover:text-lmsy-blue transition-colors">
                VIEW_IN_INBOX →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
