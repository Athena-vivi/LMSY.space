/**
 * Asset Vault Constants
 *
 * Tab configurations and filter options
 */

import { Images, Calendar, FileText, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type VaultTabId = 'all' | 'chronicle' | 'editorial' | 'milestones';

export interface VaultTab {
  id: VaultTabId;
  label: string;
  icon: LucideIcon;
}

export const VAULT_TABS: VaultTab[] = [
  { id: 'all', label: 'ALL_ASSETS', icon: Images },
  { id: 'chronicle', label: 'CHRONICLE', icon: Calendar },
  { id: 'editorial', label: 'EDITORIAL', icon: FileText },
  { id: 'milestones', label: 'MILESTONES', icon: Star },
];

export const VAULT_HEADER_TITLES: Record<VaultTabId, { title: string; subtitle: string }> = {
  all: {
    title: 'ASSET_VAULT',
    subtitle: 'IMAGE_ARCHIVE_MANAGEMENT_SYSTEM',
  },
  chronicle: {
    title: 'CHRONICLE_EDITOR',
    subtitle: 'TIMELINE_CURATION_EVENT_MANAGEMENT',
  },
  editorial: {
    title: 'EDITORIAL_STUDIO',
    subtitle: 'MAGAZINE_ARCHIVE_MANAGEMENT_SYSTEM',
  },
  milestones: {
    title: 'MILESTONE_MANAGER',
    subtitle: 'HOMEPAGE_TIMELINE_IMAGES',
  },
};

export const YEARS = ['2022', '2023', '2024', '2025', '∞'] as const;

export const MILESTONE_YEAR_MAPPING: Record<string, string> = {
  '∞': 'infinity',
};

// Category tag options for gallery items
export const CATEGORY_TAGS = [
  { value: '', label: 'ALL_CATEGORIES' },
  { value: 'official_stills', label: 'OFFICIAL_STILLS' },
  { value: 'bts', label: 'BEHIND_THE_SCENES' },
  { value: 'press_events', label: 'PRESS_EVENTS' },
] as const;
