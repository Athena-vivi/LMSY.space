import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { apiServerError } from '@/lib/security/http';

/**
 * Homepage portraits.
 *
 * The people cards used to pick a still from whichever project the person was
 * credited in. It was a real photo of them, but never the photo the card
 * wanted, so the curator picks it here instead - the same gesture as choosing
 * each year's photo in the milestone grid.
 *
 * The value lives on `profiles.avatar_url`, which is already the field the
 * people index and the person page read, so one choice covers all three
 * places. Sending `imageUrl: null` clears it and the homepage falls back to
 * the initial-letter placeholder rather than inventing a picture.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('profiles')
      .select('id, name, nickname, slug, avatar_url, role_label')
      .order('nickname', { ascending: true });

    if (error) {
      console.error('[PORTRAIT_API] Failed to load profiles:', error);
      return apiServerError('admin/people/portrait GET', error);
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    console.error('[PORTRAIT_API] Error:', error);
    return apiServerError('admin/people/portrait', error);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { profileId, imageUrl } = body as {
      profileId?: string;
      imageUrl?: string | null;
    };

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('profiles')
      .update({ avatar_url: imageUrl ?? null })
      .eq('id', profileId)
      .select('id, name, nickname, slug, avatar_url')
      .single();

    if (error) {
      console.error('[PORTRAIT_API] Failed to save portrait:', error);
      return apiServerError('admin/people/portrait PATCH', error);
    }

    console.log('[PORTRAIT_API] Saved portrait:', { profileId, imageUrl });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[PORTRAIT_API] Error:', error);
    return apiServerError('admin/people/portrait', error);
  }
}
