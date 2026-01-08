/**
 * 馆长客户端 (Admin Client)
 *
 * 用途：仅用于服务端（Server Components, API Routes, Server Actions）
 * 权限：使用 SERVICE_ROLE_KEY，绕过 RLS 策略，拥有完全访问权限
 * 使用场景：/admin 路由下的写操作、删除操作、管理任务
 *
 * 🔒 安全警告：
 * - SERVICE_ROLE_KEY 绝不能暴露到浏览器端
 * - 此客户端只能在服务器端代码中使用
 * - 严禁在任何 'use client' 组件中导入此文件
 * - 严禁将此客户端返回给前端
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * 馆长 Supabase 客户端
 * 使用 SERVICE_ROLE_KEY，仅用于服务端管理操作
 *
 * ⚠️ 仅在以下场景使用：
 * 1. API 路由 (app/api/**/route.ts)
 * 2. Server Components (没有 'use client' 的组件)
 * 3. Server Actions
 * 4. 中间件
 *
 * 🚫 严禁在以下场景使用：
 * 1. 客户端组件 ('use client')
 * 2. 浏览器环境
 * 3. 可能暴露给前端的任何代码
 */
export const supabaseAdmin: SupabaseClient = (() => {
  // 安全检查：确保不在浏览器端执行
  if (typeof window !== 'undefined') {
    throw new Error(
      'CRITICAL SECURITY ERROR: supabaseAdmin (SERVICE_ROLE_KEY) must never be used in browser code. ' +
      'This key has full administrative access and bypasses all RLS policies. ' +
      'Use supabase (public client) instead.'
    );
  }

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations.');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'lmsy-space-admin',
      },
    },
  });
})();

/**
 * 辅助函数：验证当前环境是否安全使用管理员客户端
 * @returns 如果安全返回 true，否则返回 false
 */
export function isServerEnvironment(): boolean {
  return typeof window === 'undefined';
}

/**
 * 辅助函数：获取管理员客户端（带安全检查）
 * 如果在浏览器端调用，会抛出错误而不是返回客户端
 * @returns Supabase 管理员客户端
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!isServerEnvironment()) {
    throw new Error(
      'CRITICAL SECURITY ERROR: supabaseAdmin cannot be accessed from browser code. ' +
      'Use API routes or server actions instead.'
    );
  }

  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin client is not initialized');
  }

  return supabaseAdmin;
}
