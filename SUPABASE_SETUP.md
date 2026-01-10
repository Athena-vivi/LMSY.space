# Supabase Configuration Guide

## Critical Setup: Exposed Schemas

To fix the **400 errors** you're seeing, you must configure Supabase to expose the `lmsy_archive` schema to client requests.

### Why This Is Required

By default, Supabase only exposes the `public` schema to API clients. Since all your archive data (gallery, projects, members, messages, etc.) is stored in the custom `lmsy_archive` schema, API requests will fail with **400 errors** until you expose this schema.

### How to Configure

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Project Settings** → **API**
3. Find the **Exposed Schemas** section
4. Add `lmsy_archive` to the list (it may already be listed - ensure it's **checked/enabled**)
5. Click **Save**

The list should look like:
```
[x] public
[x] lmsy_archive
[ ] storage
```

---

## Schema Configuration Summary

### Client-Side (Browser)
- **File**: `lib/supabase/client.ts`
- **Status**: ✅ Already configured with `db: { schema: 'lmsy_archive' }`
- **Usage**: Public data access, respects RLS policies

### Server-Side (API Routes)
All API routes now use `createServerClient` with explicit schema configuration:

- ✅ `app/api/admin/upload/route.ts` - POST + GET
- ✅ `app/api/admin/gallery/route.ts` - POST
- ✅ `app/api/admin/messages/route.ts` - GET
- ✅ `app/api/admin/messages/[id]/approve/route.ts` - PATCH + DELETE
- ✅ `app/api/admin/magazine/route.ts` - POST + GET
- ✅ `app/api/admin/stats/route.ts` - GET (uses admin client only)
- ✅ `app/api/admin/diagnose/db/route.ts` - GET (uses admin client only)
- ✅ `app/api/admin/diagnose/r2/route.ts` - GET (no DB needed)

### Admin Client (Server-Only)
- **File**: `lib/supabase/admin.ts`
- **Status**: ✅ Already configured with `db: { schema: 'lmsy_archive' }`
- **Usage**: Bypasses RLS, for admin operations only

---

## Authentication Flow (401 Errors)

### Current Implementation
All admin API routes follow this security pattern:

1. **SSR Authentication**: Uses `createServerClient` with cookies to verify user session
2. **Email Verification**: Hard-coded check against `NEXT_PUBLIC_ADMIN_EMAIL`
3. **Admin Role Check**: Queries `lmsy_archive.admin_users` table
4. **Admin Client Operations**: Uses `getSupabaseAdmin()` with SERVICE_ROLE_KEY

### If You See 401 Errors
1. **Clear your browser cache and localStorage**
2. **Log out and log in again** at `/admin/login`
3. Ensure your session cookie is being sent with API requests
4. Verify `NEXT_PUBLIC_ADMIN_EMAIL` matches your Supabase auth email

---

## Troubleshooting

### 400 Bad Request Errors
**Cause**: API trying to access `public.projects` instead of `lmsy_archive.projects`

**Fix**: Add `lmsy_archive` to Exposed Schemas in Supabase Dashboard

### 401 Unauthorized Errors
**Cause**: Invalid or expired session

**Fix**:
1. Clear browser cache
2. Log out and log in again
3. Check that cookies are being sent with requests

### Still Seeing Errors?
Check the browser console and server logs for detailed error messages. The 400 errors will include the exact SQL query that failed, showing which schema it tried to access.
