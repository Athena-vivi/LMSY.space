/**
 * Vault Tabs Component
 *
 * Tab navigation for Asset Vault views
 */

'use client';

import { motion } from 'framer-motion';
import { VAULT_TABS, type VaultTabId } from '../constants';

interface VaultTabsProps {
  activeTab: VaultTabId;
  onChange: (tab: VaultTabId) => void;
  data: {
    gallery: any[];
    projects: any[];
    events: any[];
    milestones: Record<string, any>;
  };
}

export function VaultTabs({ activeTab, onChange, data }: VaultTabsProps) {
  // Get counts for each tab
  const getCount = (tabId: VaultTabId): number => {
    switch (tabId) {
      case 'all':
        return data.gallery.length;
      case 'chronicle':
        return data.events.length;
      case 'editorial':
        return data.projects.filter(p => p.category === 'editorial' || p.category === 'series').length;
      case 'milestones':
        return Object.keys(data.milestones).length;
      default:
        return 0;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {VAULT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = getCount(tab.id);

        return (
          <motion.button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative px-4 py-2 rounded-lg text-sm font-mono tracking-wider transition-all duration-200"
            style={{
              backgroundColor: isActive ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid transparent',
            }}
            whileHover={{ scale: isActive ? 1.02 : 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glow effect for active tab */}
            {isActive && (
              <motion.div
                layoutId="activeVaultTab"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.05))',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.1), 0 0 40px rgba(56, 189, 248, 0.05)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            <div className="relative flex items-center gap-2">
              <Icon
                className="h-4 w-4"
                strokeWidth={1.5}
                style={{ color: isActive ? '#fbb142' : 'rgba(255, 255, 255, 0.3)' }}
              />
              <span
                className="font-light"
                style={{ color: isActive ? '#fbb142' : 'rgba(255, 255, 255, 0.5)' }}
              >
                {tab.label}
              </span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{
                    backgroundColor: isActive ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#fbb142' : 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {count}
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
