'use client';

import { useState, useCallback, useEffect } from 'react';
import UploadZone from './_components/upload-zone';
import EditorialHeader from './_components/editorial-header';
import GalleryGrid from './_components/gallery-grid';
import CuratorSidebar from './_components/curator-sidebar';
import ImageLightbox from './_components/image-lightbox';
import { Toast } from './_components/toast';
import IngestionMonitor from './_components/ingestion-monitor';
import { PageStyles, ScanlineEffect } from './_components/page-styles';
import { PageHeader } from './_components/page-header';
import { useIngestion } from './_hooks/use-ingestion';
import { useUploadState } from './_hooks/use-upload-state';

/**
 * 🔒 ADMIN UPLOAD PAGE
 *
 * Minimal component container - all business logic extracted to hooks.
 *
 * Architecture:
 * - useUploadState: File handling, metadata, catalog ID, tags
 * - useIngestion: Upload pipeline (WebP → R2 → Database)
 * - Components: Pure presenters receiving data via props
 */
export default function AdminUploadPage() {
  // ========================================
  // HOOKS
  // ========================================
  const uploadState = useUploadState();
  const { ingestionMonitor, startIngestion, closeMonitor } = useIngestion();

  // Local UI state only
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // ========================================
  // FILE DROP HANDLERS
  // ========================================
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    uploadState.handleFiles(files);
  }, [uploadState]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      uploadState.handleFiles(files);
    }
  }, [uploadState]);

  // ========================================
  // LIGHTBOX HANDLERS
  // ========================================
  const handleLightboxNavigate = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev' && lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (direction === 'next' && lightboxIndex !== null && lightboxIndex < uploadState.uploadItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  }, [lightboxIndex, uploadState.uploadItems.length]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  // ========================================
  // UPLOAD HANDLER
  // ========================================
  const handleUpload = async () => {
    if (uploadState.uploadItems.length === 0) return;

    const targetDate = uploadState.batchEventDate || uploadState.eventDate;
    if (!targetDate) {
      alert('⚠️ DATE REQUIRED\n\nPlease select an Event Date before uploading.');
      return;
    }

    const formattedDate = new Date(targetDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const confirmed = confirm(
      `Ready to archive ${uploadState.uploadItems.length} artifact${uploadState.uploadItems.length > 1 ? 's' : ''} into ${formattedDate}?\n\n` +
      `• Files: ${uploadState.uploadItems.length}\n` +
      `• Event Date: ${formattedDate}\n` +
      (uploadState.selectedProject ? `• Project: ${uploadState.projects.find(p => p.id === uploadState.selectedProject)?.title || 'Unknown'}\n` : '') +
      (uploadState.dateMismatchWarning ? `\n⚠️ ${uploadState.dateMismatchWarning}` : '') +
      `\n\nProceed?`
    );

    if (!confirmed) return;

    setIsUploading(true);

    await startIngestion({
      uploadItems: uploadState.uploadItems.map(item => ({
        id: item.id,
        file: item.file,
        displayName: item.displayName,
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
        const totalOriginal = uploadResults.reduce((sum, r) => sum + (r.metadata?.originalSize || 0), 0);
        const totalWebP = uploadResults.reduce((sum, r) => sum + (r.metadata?.webpSize || 0), 0);
        const compressionInfo = totalOriginal > 0
          ? `\n\nOriginal: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB\nOptimized: ${(totalWebP / 1024 / 1024).toFixed(2)} MB WebP\nSaved: ${((1 - totalWebP / totalOriginal) * 100).toFixed(1)}%`
          : '';

        alert(`✅ Successfully uploaded all ${uploadState.uploadItems.length} images!${compressionInfo}`);
        uploadState.resetForm();
      },
      onError: (errorMessage) => {
        alert(`❌ UPLOAD FAILED\n\n${errorMessage}`);
      },
    });

    setIsUploading(false);
  };

  // ========================================
  // PROJECT CREATION HANDLER
  // ========================================
  const handleProjectCreated = (newProject: any) => {
    const message = uploadState.handleProjectCreated(newProject);
    setToastMessage(message);
  };

  // ========================================
  // TAG INPUT HANDLER
  // ========================================
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && uploadState.tagInput) {
      e.preventDefault();
      uploadState.addTag(uploadState.tagInput);
    }
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="relative min-h-screen bg-black">
      <PageStyles />
      <ScanlineEffect />

      <div className="relative z-10 px-4 py-6 max-w-[1800px] mx-auto">
        <PageHeader
          itemCount={uploadState.uploadItems.length}
          eventDate={uploadState.eventDate}
        />

        <UploadZone onDrop={handleDrop} onFileInput={handleFileInput} />

        {/* Main Canvas */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Editorial Header + Gallery Grid */}
          <div className="col-span-12 xl:col-span-10 space-y-6">
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

          {/* Right: Curator Sidebar */}
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
            onClose={closeMonitor}
            onRetry={handleUpload}
          />
        )}
      </div>
    </div>
  );
}
