/**
 * Upload Provider - Global Upload Modal System
 *
 * Usage:
 * 1. Wrap admin layout with <UploadProvider>
 * 2. Use hook: const { openUpload } = useUploadModal();
 * 3. Call openUpload(onSuccess) to trigger modal
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BulkUploadModal } from '@/components/bulk-upload-modal';

interface UploadModalState {
  isOpen: boolean;
  onSuccess?: () => void;
}

interface UploadContextValue {
  openUpload: (onSuccess?: () => void) => void;
  closeUpload: () => void;
  isOpen: boolean;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UploadModalState>({ isOpen: false });

  const openUpload = useCallback((onSuccess?: () => void) => {
    setState({ isOpen: true, onSuccess });
  }, []);

  const closeUpload = useCallback(() => {
    setState({ isOpen: false });
  }, []);

  return (
    <UploadContext.Provider value={{ openUpload, closeUpload, isOpen: state.isOpen }}>
      {children}
      {state.isOpen && (
        <BulkUploadModal
          isOpen={state.isOpen}
          onClose={closeUpload}
          onSuccess={() => {
            state.onSuccess?.();
            closeUpload();
          }}
        />
      )}
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

// Convenience hook
export function useBulkUpload() {
  const { openUpload } = useUploadModal();
  return { openUpload };
}
