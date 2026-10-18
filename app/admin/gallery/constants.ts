/**
 * Asset Vault Constants
 *
 * Tab configurations and filter options
 */

import { Images, Calendar, FileText, Star, UserRound, DoorOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { milestoneYears } from '@/lib/milestone-years';

export type VaultTabId =
  | 'all'
  | 'chronicle'
  | 'editorial'
  | 'portals'
  | 'milestones'
  | 'portraits';

export interface VaultTab {
  id: VaultTabId;
  label: string;
  icon: LucideIcon;
}

export const VAULT_TABS: VaultTab[] = [
  { id: 'all', label: 'ALL_ASSETS', icon: Images },
  { id: 'chronicle', label: 'CHRONICLE', icon: Calendar },
  { id: 'editorial', label: 'EDITORIAL', icon: FileText },
  { id: 'portals', label: 'PORTALS', icon: DoorOpen },
  { id: 'milestones', label: 'MILESTONES', icon: Star },
  { id: 'portraits', label: 'PORTRAITS', icon: UserRound },
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
  portals: {
    title: 'PORTAL_MANAGER',
    subtitle: 'HOMEPAGE_ENTRY_IMAGES',
  },
  milestones: {
    title: 'MILESTONE_MANAGER',
    subtitle: 'HOMEPAGE_TIMELINE_IMAGES',
  },
  portraits: {
    title: 'PORTRAIT_MANAGER',
    subtitle: 'HOMEPAGE_PEOPLE_IMAGES',
  },
};

// One slot per year, 2022 up to the current year. The slot number is the
// year, so the newest year always has a slot instead of falling off the end.
export const YEARS: string[] = milestoneYears();

// Category tag options for gallery items
export const CATEGORY_TAGS = [
  { value: '', label: 'ALL_CATEGORIES' },
  { value: 'official_stills', label: 'OFFICIAL_STILLS' },
  { value: 'bts', label: 'BEHIND_THE_SCENES' },
  { value: 'press_events', label: 'PRESS_EVENTS' },
] as const;
