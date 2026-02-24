'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload as UploadIcon } from 'lucide-react';
import { useIngestion } from '../app/admin/upload/_hooks/use-ingestion';
import { useUploadState } from '../app/admin/upload/_hooks/use-upload-state';
import { validateBatch, checkBatchDimensions } from '@/lib/security/file-validator';

// Reuse upload components
import UploadZone from '../app/admin/upload/_components/upload-zone';
import EditorialHeader from '../app/admin/upload/_components/editorial-header';
import GalleryGrid from '../app/admin/upload/_components/gallery-grid';
import CuratorSidebar from '../app/admin/upload/_components/curator-sidebar';
import ImageLightbox from '../app/admin/upload/_components/image-lightbox';
import { Toast } from '../app/admin/upload/_components/toast';
import IngestionMonitor from '../app/admin/upload/_components/ingestion-monitor';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const uploadState = useUploadState();
  const { ingestionMonitor, startIngestion, closeMonitor } = useIngestion();

  // Local UI state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingCleanup, setPendingCleanup] = useState<any[] | null>(null);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading && !ingestionMonitor.visible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isUploading, ingestionMonitor.visible, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // File drop handlers (with security validation)
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    // Security validation
    const batchValidation = validateBatch(files);
    if (!batchValidation.valid) {
      setToastMessage(`⚠️ ${batchValidation.error}`);
      return;
    }

    // Dimension check (async)
    const dimCheck = await checkBatchDimensions(files);
    if (!dimCheck.valid) {
      const failed = dimCheck.results.find(r => !r.valid);
      setToastMessage(`⚠️ ${failed?.error || 'Image validation failed'}`);
      return;
    }

    uploadState.handleFiles(files);
  }, [uploadState]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Security validation
      const batchValidation = validateBatch(files);
      if (!batchValidation.valid) {
        setToastMessage(`⚠️ ${batchValidation.error}`);
        return;
      }

      // Dimension check (async)
      const dimCheck = await checkBatchDimensions(files);
      if (!dimCheck.valid) {
        const failed = dimCheck.results.find(r => !r.valid);
        setToastMessage(`⚠️ ${failed?.error || 'Image validation failed'}`);
        return;
      }

      uploadState.handleFiles(files);
    }
  }, [uploadState]);

  // Lightbox handlers
  const handleLightboxNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (direction === 'next' && lightboxIndex !== null && lightboxIndex < uploadState.uploadItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  }, [lightboxIndex, uploadState.uploadItems.length]);

  // Upload handler
  const handleUpload = async () => {
    if (uploadState.uploadItems.length === 0) return;

    const targetDate = uploadState.batchEventDate || uploadState.eventDate;
    if (!targetDate) {
      setToastMessage('⚠️ DATE REQUIRED - Please select an Event Date');
      return;
    }

    setIsUploading(true);

    await startIngestion({
      uploadItems: uploadState.uploadItems.map(item => ({
        id: item.id,
        file: item.file,
        displayName: item.displayName,
        preview: item.preview,
      })),
      eventDate: targetDate,
      title: uploadState.title,
      selectedTags: uploadState.selectedTags,
      selectedProject: uploadState.selectedProject,
      archiveNumber: uploadState.archiveNumber,
      isCatalogLocked: uploadState.isCatalogLocked,
      hasManuallyEdited: uploadState.hasManuallyEdited,
      getProjectById: (id) => uploadState.projects.find(p => p.id === id),
      onSuccess: async (uploadResults) => {
        setToastMessage(`✅ Successfully uploaded ${uploadState.uploadItems.length} images!`);
        setPendingCleanup(uploadState.uploadItems);
        uploadState.resetFormState();

        // Trigger parent callback
        onSuccess?.();
      },
      onError: (errorMessage) => {
        setToastMessage(`❌ UPLOAD FAILED - ${errorMessage}`);
      },
    });

    setIsUploading(false);
  };

  // Monitor close handler
  const handleCloseMonitor = useCallback(() => {
    if (pendingCleanup) {
      uploadState.cleanupPreviews(pendingCleanup);
      setPendingCleanup(null);
    }
    closeMonitor();
  }, [pendingCleanup, uploadState, closeMonitor]);

  // Tag input handler
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && uploadState.tagInput) {
      e.preventDefault();
      uploadState.addTag(uploadState.tagInput);
    }
  };

  // Project creation handler
  const handleProjectCreated = (newProject: any) => {
    const message = uploadState.handleProjectCreated(newProject);
    setToastMessage(message);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isUploading && !ingestionMonitor.visible && onClose()}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-7xl h-[85vh] bg-black border rounded-lg overflow-hidden flex flex-col pointer-events-auto"
          style={{
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(251, 191, 36, 0.1)' }}>
                <UploadIcon className="h-5 w-5 text-lmsy-yellow/80" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="font-serif text-xl text-white/90">Bulk Upload</h2>
                <p className="text-xs text-white/40 font-mono">Import images to draft inbox</p>
              </div>
            </div>
            <button
              onClick={() => !isUploading && !ingestionMonitor.visible && onClose()}
              disabled={isUploading || ingestionMonitor.visible}
              className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              {/* Unified Grid Layout */}
              <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Upload Zone + Editorial + Gallery */}
                <div className="col-span-12 xl:col-span-10 space-y-6">
                  <UploadZone onDrop={handleDrop} onFileInput={handleFileInput} />

                  <EditorialHeader
                    title={uploadState.title}
                    description={uploadState.description}
                    eventDate={uploadState.eventDate}
                    selectedProject={uploadState.selectedProject}
                    onTitleChange={uploadState.setTitle}
                    onDescriptionChange={uploadState.setDescription}
                  />

                  <GalleryGrid
                    uploadItems={uploadState.uploadItems}
                    onReorder={uploadState.setUploadItems}
                    onRemove={uploadState.removeFile}
                    onItemClick={setLightboxIndex}
                    getPreviewCatalogId={uploadState.getPreviewCatalogId}
                  />
                </div>

                {/* Right Column: Curator Sidebar */}
                <div className="col-span-12 xl:col-span-2">
                  <CuratorSidebar
                    eventDate={uploadState.eventDate}
                    onEventDateChange={uploadState.setEventDate}
                    selectedProject={uploadState.selectedProject}
                    onProjectChange={uploadState.setSelectedProject}
                    selectedMember={uploadState.selectedMember}
                    onMemberChange={uploadState.setSelectedMember}
                    projects={uploadState.projects}
                    members={uploadState.members}
                    dateMismatchWarning={uploadState.dateMismatchWarning}
                    showBatchEditor={uploadState.showBatchEditor}
                    onToggleBatchEditor={() => uploadState.setShowBatchEditor(!uploadState.showBatchEditor)}
                    batchCredits={uploadState.batchCredits}
                    onBatchCreditsChange={uploadState.setBatchCredits}
                    batchCatalogId={uploadState.batchCatalogId}
                    onBatchCatalogIdChange={uploadState.setBatchCatalogId}
                    batchMagazineIssue={uploadState.batchMagazineIssue}
                    onBatchMagazineIssueChange={uploadState.setBatchMagazineIssue}
                    selectedTags={uploadState.selectedTags}
                    onRemoveTag={uploadState.removeTag}
                    onAddTag={uploadState.addTag}
                    tagInput={uploadState.tagInput}
                    onTagInputChange={uploadState.setTagInput}
                    onTagInputKeyDown={handleTagInputKeyDown}
                    isUploading={isUploading}
                    uploadItemsCount={uploadState.uploadItems.length}
                    onUpload={handleUpload}
                    showProjectModal={showProjectModal}
                    onToggleProjectModal={() => setShowProjectModal(!showProjectModal)}
                    onProjectCreated={handleProjectCreated}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="px-6 py-3 border-t flex items-center justify-between text-xs font-mono flex-shrink-0"
            style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <span className="text-white/30">
              {uploadState.uploadItems.length} files selected
            </span>
            <span className="text-white/30">
              Press ESC to close
            </span>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        lightboxIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={handleLightboxNavigate}
        uploadItems={uploadState.uploadItems}
        getPreviewCatalogId={uploadState.getPreviewCatalogId}
      />

      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Ingestion Monitor */}
      {ingestionMonitor.visible && (
        <IngestionMonitor
          state={ingestionMonitor}
          onClose={handleCloseMonitor}
          onRetry={handleUpload}
        />
      )}
    </>
  );
}

// Trigger button component
export function BulkUploadButton({ onClick, count }: { onClick: () => void; count?: number }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.1))',
        border: '1px solid rgba(251, 191, 36, 0.2)',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <UploadIcon className="h-4 w-4 text-lmsy-yellow/80" strokeWidth={1.5} />
      <span className="text-white/70">Bulk Upload</span>
      {count !== undefined && count > 0 && (
        <span className="px-1.5 py-0.5 bg-lmsy-blue/20 border border-lmsy-blue/30 rounded text-xs text-lmsy-blue">
          {count}
        </span>
      )}
    </motion.button>
  );
}
