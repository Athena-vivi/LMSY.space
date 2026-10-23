import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { countAllProjects } from '@/lib/data/projects';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get counts from all collections using admin client
    const [galleryResult, projects] = await Promise.all([
      supabaseAdmin.schema('lmsy_archive').from('gallery').select('id', { count: 'exact', head: true }),
      countAllProjects(supabaseAdmin),
    ]);

    return NextResponse.json({
      gallery: galleryResult.count || 0,
      projects,
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    return apiServerError('admin/stats GET', error);
  }
}
