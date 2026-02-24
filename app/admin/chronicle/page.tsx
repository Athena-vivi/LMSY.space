/**
 * Chronicle Page - Redirect to Asset Vault
 *
 * This page now lives within the Asset Vault under the Chronicle tab.
 * Redirecting to /admin/gallery with the chronicle tab pre-selected.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChronicleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/gallery?tab=chronicle');
  }, [router]);

  return null;
}
