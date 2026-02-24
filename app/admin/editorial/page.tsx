/**
 * Editorial Page - Redirect to Asset Vault
 *
 * This page now lives within the Asset Vault under the Editorial tab.
 * Redirecting to /admin/gallery with the editorial tab pre-selected.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditorialRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/gallery?tab=editorial');
  }, [router]);

  return null;
}
