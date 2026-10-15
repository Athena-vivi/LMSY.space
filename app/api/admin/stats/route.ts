import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get counts from all collections using admin client
    const [galleryResult, projectsResult] = await Promise.all([
      supabaseAdmin.schema('lmsy_archive').from('gallery').select('id', { count: 'exact', head: true }),
      supabaseAdmin.schema('lmsy_archive').from('projects').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      gallery: galleryResult.count || 0,
      projects: projectsResult.count || 0,
      chronicle: 0, // Will be implemented when chronicle table exists
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    return apiServerError('admin/stats GET', error);
  }
}
