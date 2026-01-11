/**
 * Supabase 数据库类型定义
 *
 * 此文件包含所有数据库表的 TypeScript 接口
 * 与 Supabase 数据库表结构保持同步
 */

// 成员表 (members)
export interface Member {
  id: string;
  name: string;
  nickname: string;
  birthday: string | null;
  height: string | null;
  bio: string | null;
  avatar_url: string | null;
  ig_handle: string | null;
  x_handle: string | null;
  weibo_handle: string | null;
  xhs_handle: string | null;
  created_at: string;
}

// 项目表 (projects)
export type ProjectCategory = 'series' | 'editorial' | 'appearance' | 'journal' | 'commercial';

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  release_date: string | null;
  description: string | null;
  cover_url: string | null;
  watch_url: string | null;
  tags: string[] | null;
  created_at: string;
}

// 图库表 (gallery)
export type GalleryCategoryTag = 'official_stills' | 'bts' | 'press_events' | null;

export interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
  tag: string | null;
  is_featured: boolean;
  catalog_id: string | null;  // LMSY-2026-XXX
  is_editorial: boolean;  // 策展特别推荐
  curator_note: string | null;  // Markdown 格式的策展笔记
  blur_data: string | null;  // Blur placeholder for image optimization
  category_tag: GalleryCategoryTag;  // 项目内分类标签 (stills/bts/press)
  project_id: string | null;  // 关联项目ID
  created_at: string;
}

// 日程表 (schedule)
export interface Schedule {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  link: string | null;
  created_at: string;
}

// 杂志特辑表 (editorials)
export interface Editorial {
  id: string;
  mag_name: string;
  slug: string;
  issue_date: string;
  cover_url: string;
  images: string[];
  credits: Record<string, string>;
  description: string;
  created_at: string;
}

// 时间线事件表 (timeline_events)
export interface TimelineEvent {
  id: string;
  event_date: string;
  event_type: 'milestone' | 'photoshoot' | 'project' | 'schedule';
  title: string;
  description: string | null;
  image_url: string | null;
  related_id: string | null;  // 关联项目、日程等的 ID
  created_at: string;
}

// 留言表 (whispers)
export interface Whisper {
  id: string;
  content: string;
  author: string;
  location: string | null;
  color_pref: 'yellow' | 'blue';
  is_approved: boolean;  // 是否已审核
  created_at: string;
}
