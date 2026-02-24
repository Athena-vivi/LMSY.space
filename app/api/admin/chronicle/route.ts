/**
 * GET /api/admin/chronicle - Get all chronicle events
 * POST /api/admin/chronicle - Create new event
 * DELETE /api/admin/chronicle - Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/server-auth';

// GET - Fetch all chronicle events
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('chronicle_events')
      .select('*')
      .order('event_date', { ascending: false });

    if (error) {
      console.error('[CHRONICLE_API] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      events: data || [],
    });
  } catch (error) {
    console.error('[CHRONICLE_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new chronicle event
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, event_date, event_type, image_ids } = body;

    if (!title || !event_date) {
      return NextResponse.json(
        { error: 'Title and event_date are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('chronicle_events')
      .insert({
        title,
        description: description || '',
        event_date,
        event_type: event_type || 'custom',
        image_ids: image_ids || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[CHRONICLE_API] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: data,
    });
  } catch (error) {
    console.error('[CHRONICLE_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete chronicle event
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('chronicle_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('[CHRONICLE_API] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[CHRONICLE_API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
