/**
 * Global Upload Provider
 *
 * Provides a global upload modal that can be triggered from anywhere in the admin panel.
 *
 * Usage:
 * 1. Wrap your admin layout with <UploadProvider>
 * 2. Use the useUploadModal hook to trigger: const { openUpload } = useUploadModal();
 * 3. Call openUpload() to open the modal
 * 4. Pass onSuccess callback to refresh data after upload
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BulkUploadModal } from '@/components/bulk-upload-modal';

interface UploadContextValue {
  openUpload: (onSuccess?: () => void) => void;
  closeUpload: () => void;
  isOpen: boolean;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>();

  const openUpload = useCallback((onSuccess?: () => void) => {
    setOnSuccessCallback(() => onSuccess);
    setIsOpen(true);
  }, []);

  const closeUpload = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(undefined);
  }, []);

  const handleSuccess = useCallback(() => {
    onSuccessCallback?.();
    closeUpload();
  }, [onSuccessCallback, closeUpload]);

  return (
    <UploadContext.Provider value={{ openUpload, closeUpload, isOpen }}>
      {children}
      <BulkUploadModal isOpen={isOpen} onClose={closeUpload} onSuccess={handleSuccess} />
    </UploadContext.Provider>
  );
}

export function useUploadModal() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploadModal must be used within UploadProvider');
  }
  return context;
}

// Convenience hook for components that just want to trigger upload
export function useBulkUpload() {
  const { openUpload } = useUploadModal();
  return { openUpload };
}
