'use client';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export function SectionIntro({
  iconColor,
  title,
  description,
  blockKey,
}: {
  iconColor: string;
  title: string;
  description: string;
  blockKey: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
    >
      <div className="mb-4 flex items-center gap-3">
        <FileText className={`h-5 w-5 ${iconColor}`} />
        <h2 className="font-serif text-2xl text-white/90">{title}</h2>
      </div>
      <p className="text-sm text-white/45">
        {description}
        <span className="mx-1 font-mono text-white/60">{blockKey}</span>.
      </p>
    </motion.div>
  );
}
