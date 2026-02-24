/**
 * Vault Header Component
 *
 * Page title and subtitle based on active tab
 */

'use client';

import { motion } from 'framer-motion';
import { VAULT_HEADER_TITLES, type VaultTabId } from '../constants';

interface VaultHeaderProps {
  activeTab: VaultTabId;
}

export function VaultHeader({ activeTab }: VaultHeaderProps) {
  const { title, subtitle } = VAULT_HEADER_TITLES[activeTab];

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-1"
    >
      <h1 className="font-serif text-3xl md:text-4xl font-light text-white/90 tracking-tight">
        {title}
      </h1>
      <p className="text-xs font-mono text-white/30 tracking-wider">
        {subtitle}
      </p>
    </motion.div>
  );
}
