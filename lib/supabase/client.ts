/**
 * 公共客户端 (Public Client)
 *
 * 用途：仅用于浏览器端（'use client'）和普通访客的公共数据读取
 * 权限：受数据库 RLS（行级安全）策略限制
 * 使用场景：前台展示页 (Chronicle, Gallery, Editorial, Resonance 等)
 *
 * ⚠️ 安全提醒：
 * - 此客户端使用 ANON_KEY，只能访问 RLS 策略允许的公共数据
 * - 严禁在此文件中使用 SERVICE_ROLE_KEY
 * - 所有写操作（INSERT/UPDATE/DELETE）都应通过服务端 API 路由完成
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase public client is not initialized. ' +
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

/**
 * 公共 Supabase 客户端
 * 用于浏览器端和公开数据访问
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // 使用 PKCE 流程提高安全性
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'lmsy-space-public',
    },
  },
});

/**
 * 获取 Supabase Storage 的公共 URL
 * @param bucket 存储桶名称
 * @param path 文件路径
 */
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
