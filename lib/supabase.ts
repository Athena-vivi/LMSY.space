/**
 * Supabase 客户端兼容层
 *
 * 为了向后兼容，此文件重新导出客户端
 * 新代码请直接导入：
 * - 公共客户端：from '@/lib/supabase/client'
 * - 管理员客户端：from '@/lib/supabase/admin'
 *
 * @deprecated 请直接导入所需的客户端，而不是使用此文件
 */

// 公共客户端重新导出
export { supabase, getPublicUrl } from './supabase/client';

// 管理员客户端重新导出
export { supabaseAdmin, getSupabaseAdmin, isServerEnvironment } from './supabase/admin';

// 类型定义重新导出
export type { Member, Project, GalleryItem, Schedule } from './supabase/types';
