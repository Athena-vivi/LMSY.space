import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/api-auth';
import { codeFromTitle } from '@/lib/catalog-id';

/**
 * The controlled vocabulary the promote wizard picks from: brands, programmes,
 * publication issues, topics.
 *
 * Reading is open to any signed-in admin; writing is the point of the table -
 * a new brand should be a form submission, not a code change. Codes are derived
 * from the display name when the caller does not send one, so the curator types
 * "Sirivannavari" and the segment comes out SIRIVANNAVARI.
 */

const KINDS = ['brand', 'program', 'publication', 'topic'] as const;
type RegistryKind = (typeof KINDS)[number];

/** Only programmes are scoped, and only by the talks shelf. */
const PROGRAM_SCOPES = ['interview', 'variety', 'radio'];

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const kind = request.nextUrl.searchParams.get('kind');
    const scope = request.nextUrl.searchParams.get('scope');
    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .schema('lmsy_archive')
      .from('catalog_registry')
      .select('id, kind, scope, code, name, sort_order')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (kind) query = query.eq('kind', kind);
    if (scope) query = query.eq('scope', scope);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      kind?: string;
      scope?: string | null;
      code?: string | null;
      name?: string;
    };

    const kind = (body.kind || '').trim() as RegistryKind;
    if (!KINDS.includes(kind)) {
      return NextResponse.json(
        { error: `kind must be one of ${KINDS.join(' / ')}` },
        { status: 400 }
      );
    }

    const scope =
      kind === 'program' ? (body.scope || '').trim().toLowerCase() : '';
    if (kind === 'program' && !PROGRAM_SCOPES.includes(scope)) {
      return NextResponse.json(
        { error: `A programme needs a shelf: ${PROGRAM_SCOPES.join(' / ')}` },
        { status: 400 }
      );
    }

    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Explicit code wins when it is legal, otherwise derive it from the name.
    // 24 is the column's ceiling - a publication code carries its issue number.
    const explicit = (body.code || '').trim().toUpperCase();
    const code = /^[A-Z0-9]{2,24}$/.test(explicit) ? explicit : codeFromTitle(name, 24);
    if (!/^[A-Z0-9]{2,24}$/.test(code)) {
      return NextResponse.json(
        { error: `Cannot derive a code from "${name}" - give one explicitly (A-Z, 0-9, 2-24 chars)` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .schema('lmsy_archive')
      .from('catalog_registry')
      .insert({ kind, scope, code, name })
      .select('id, kind, scope, code, name, sort_order')
      .single();

    if (error) {
      // 23505 = the code is already taken in this kind; that is a user-facing
      // answer ("pick the existing one"), not a server fault.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `${code} already exists for ${kind}${scope ? ` / ${scope}` : ''}` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
