/**
 * Drafts Header Component
 */

'use client';

import { motion } from 'framer-motion';
import { useAdminLang } from '@/lib/admin-i18n';

export function DraftsHeader() {
  const { t } = useAdminLang();
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      <h1 className="font-serif text-3xl font-light text-ink tracking-tight">
        {t('d.title')}
      </h1>
      <p className="text-xs font-mono text-ink-2 tracking-wider">
        {t('d.subtitle')}
      </p>
    </motion.div>
  );
}
