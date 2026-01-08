import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Test: Select 1 row from lmsy_archive.profiles
    const { data, error, status, statusText } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details,
        },
        rawError: error,
        status,
        statusText,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        count: data?.length || 0,
        sample: data?.[0] || null,
        status,
        statusText,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: {
        message: error?.message || 'Unknown error',
        name: error?.name,
        stack: error?.stack,
      },
      rawError: error,
    });
  }
}
