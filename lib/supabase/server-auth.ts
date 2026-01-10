/**
 * Server-Side Authentication Helpers
 *
 * 统一处理 API 路由中的认证逻辑
 * 支持两种认证方式：
 * 1. Cookie-based session (主要)
 * 2. Authorization Bearer token (后备)
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error: string | null;
  method: 'cookie' | 'bearer' | 'none';
}

/**
 * 从 NextRequest 中获取认证用户
 * 支持双重认证机制：Cookie 和 Bearer Token
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, '') || '';

  // 创建 Supabase SSR 客户端（Schema 锁定到 lmsy_archive）
  const supabaseAuth = createServerClient(
    rawUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      },
      db: {
        schema: 'lmsy_archive',
      },
    }
  );

  // 方法 1: 尝试从 Cookie 获取用户
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser();

    if (!error && user) {
      console.log('[AUTH] ✅ Cookie authentication successful');
      return { user, error: null, method: 'cookie' };
    }

    if (error) {
      console.log('[AUTH] Cookie authentication failed:', error.message);
    }
  } catch (err) {
    console.error('[AUTH] Cookie authentication exception:', err);
  }

  // 方法 2: 后备方案 - 从 Authorization header 获取 Bearer token
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] ❌ No valid Authorization header found');
    return { user: null, error: 'No authentication found', method: 'none' };
  }

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(authHeader.substring(7));

    if (!error && user) {
      console.log('[AUTH] ✅ Bearer token authentication successful');
      return { user, error: null, method: 'bearer' };
    }

    if (error) {
      console.error('[AUTH] ❌ Bearer token authentication failed:', error.message);
      return { user: null, error: error.message, method: 'bearer' };
    }
  } catch (err) {
    console.error('[AUTH] ❌ Bearer token authentication exception:', err);
    return { user: null, error: 'Token verification failed', method: 'bearer' };
  }

  return { user: null, error: 'Authentication failed', method: 'none' };
}
