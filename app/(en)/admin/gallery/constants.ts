/**
 * Asset Vault Constants
 *
 * Tab configurations and filter options
 */

import { Images, FileText, Star, UserRound, DoorOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { milestoneYears } from '@/lib/milestone-years';

export type VaultTabId =
  | 'all'
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
  editorial: {
    title: 'EDITORIAL_STUDIO',
    subtitle: 'MAGAZINE_ARCHIVE_MANAGEMENT_SYSTEM',
  },
  portals: {
    title: 'PORTAL_MANAGER',
    subtitle: 'HOMEPAGE_DOOR_IMAGES',
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

