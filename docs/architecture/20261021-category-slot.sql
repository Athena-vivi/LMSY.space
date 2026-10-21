-- 二层（分类）封面槽位
--
-- 层的定义，2026-10-21 定：
--   门   -> gallery_assets.portal_slot（首页五入口）/ interview_slot（对话、直播两门）
--   分类 -> gallery_assets.category_slot（本文件新增）
--   事件 -> projects.cover_url
--
-- 为什么要单独一列：分类卡现在没有可指定的封面，前端自动取「该分类里第一个有封面的事件」。
-- 想指定就只能新增槽位。取值是二层的**路径**（不是分类值），因为同一个分类可能出现在
-- 两个门下（/talks/interview 与 interview 分类），路径是唯一且跟前台地址逐字一致的：
--
--   /live-events/fanmeeting   /live-events/brand-event   /live-events/birthday
--   /appearances/awards       /appearances/fashion       /appearances/brand-stage
--   /appearances/industry     /appearances/charity       /appearances/premiere
--   /talks/interview          /talks/variety             /talks/radio
--   /live/duo                 /live/lookmhee             /live/sonya
--
-- 影视门的第二层是「剧」本身（projects 行），封面走 projects.cover_url，不用这一列。
-- 杂志门和品牌门没有第二层，也不用。

alter table lmsy_archive.gallery_assets
  add column if not exists category_slot text;

comment on column lmsy_archive.gallery_assets.category_slot is
  'Pinned cover for a door''s second level, stored as its path (/live-events/fanmeeting). One row per path.';

create unique index if not exists gallery_assets_category_slot_unique
  on lmsy_archive.gallery_assets (category_slot)
  where category_slot is not null;
