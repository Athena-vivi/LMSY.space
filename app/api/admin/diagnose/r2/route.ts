import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET - R2 诊断测试
// 🔒 DEBUG MODE: Authentication temporarily disabled for R2 connection testing
export async function GET(request: NextRequest) {
  try {
    // 环境变量检查（仅服务端可见）
    const envCheck = {
      R2_ENDPOINT: !!process.env.R2_ENDPOINT,
      R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
    };

    const bucketName = process.env.R2_BUCKET_NAME || 'lmsy-archive';

    // 🔍 DEBUG: Log endpoint format for verification
    const rawEndpoint = process.env.R2_ENDPOINT;
    console.error('[R2_DEBUG] Endpoint configuration:', {
      raw: rawEndpoint,
      format: rawEndpoint?.match(/^https:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com$/) ? 'VALID' : 'INVALID',
      hasBucketName: rawEndpoint?.includes('lmsy-archive') || rawEndpoint?.includes('lmsy-gallery'),
    });

    if (!envCheck.R2_ENDPOINT || !envCheck.R2_ACCESS_KEY_ID || !envCheck.R2_SECRET_ACCESS_KEY || !envCheck.R2_BUCKET_NAME) {
      return NextResponse.json({
        success: false,
        error: {
          message: 'Incomplete R2 configuration',
          missing: Object.entries(envCheck)
            .filter(([_, exists]) => !exists)
            .map(([key]) => key),
        },
        rawError: {
          envCheck: {
            // 不暴露实际值，只暴露存在性
            R2_ENDPOINT: envCheck.R2_ENDPOINT,
            R2_ACCESS_KEY_ID: envCheck.R2_ACCESS_KEY_ID,
            R2_SECRET_ACCESS_KEY: envCheck.R2_SECRET_ACCESS_KEY,
            R2_BUCKET_NAME: envCheck.R2_BUCKET_NAME,
          },
          bucketName,
        },
      });
    }

    // 测试 R2 连接
    console.error('[R2_DEBUG] Starting R2 connection test...');
    const { testR2Connection } = await import('@/lib/r2-client');
    const result = await testR2Connection();

    // 🔍 DEBUG: Log complete result
    console.error('[R2_DEBUG] Connection test result:', {
      success: result.success,
      error: result.error,
      code: result.code,
      hasRawError: !!result.rawError,
    });

    return NextResponse.json({
      success: result.success,
      data: result.success ? {
        bucket: bucketName,
        message: 'R2 connection successful',
      } : undefined,
      error: result.error,
      code: result.code,
      rawError: result.rawError,
    });
  } catch (error: any) {
    // 🔍 DEBUG: Enhanced error logging
    console.error('[R2_RAW_ERROR] Complete error object:', {
      name: error?.name,
      message: error?.message,
      code: error?.Code || error?.name,
      httpStatusCode: error?.$metadata?.httpStatusCode,
      requestId: error?.$metadata?.requestId,
      extendedRequestId: error?.$metadata?.extendedRequestId,
      fullError: error,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error?.message || 'Diagnostic failed',
          code: error?.Code || error?.name,
          httpStatusCode: error?.$metadata?.httpStatusCode,
        },
        rawError: error,
      },
      { status: 500 }
    );
  }
}
