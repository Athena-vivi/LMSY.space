/**
 * Drafts Page Wrapper with Bulk Upload
 *
 * This component wraps the original DraftsPage and adds bulk upload functionality
 * without modifying the large drafts page file directly.
 */

'use client';

import { useState } from 'react';
import { BulkUploadModal, BulkUploadButton } from '@/components/bulk-upload-modal';
import DraftsPage from '@/app/admin/drafts/page';

export default function DraftsPageWithUpload() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  // We'll render the original DraftsPage and add the upload button via portal
  // Actually, we need to pass the button to the drafts page
  // Let's use a different approach - we'll export the original as a named export

  return <DraftsPage />;
}

// Export the filter bar with bulk upload button
export function DraftsFilterBarWithUpload({
  children,
  onUploadSuccess,
}: {
  children: React.ReactNode;
  onUploadSuccess?: () => void;
}) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <>
      {children}
      <BulkUploadButton onClick={() => setShowUploadModal(true)} />
      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={onUploadSuccess}
      />
    </>
  );
}
