/**
 * Drafts Header Component
 */

'use client';

import { motion } from 'framer-motion';

export function DraftsHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      <h1 className="font-serif text-3xl font-light text-white/90 tracking-tight">
        DRAFT_INBOX
      </h1>
      <p className="text-xs font-mono text-white/30 tracking-wider">
        CONTENT_INGESTION_CURATION_INTERFACE
      </p>
    </motion.div>
  );
}
