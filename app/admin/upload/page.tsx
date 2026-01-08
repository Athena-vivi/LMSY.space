'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import type { Project, Member } from '@/lib/supabase/types';
import UploadZone from './_components/upload-zone';
import EditorialHeader from './_components/editorial-header';
import GalleryGrid from './_components/gallery-grid';
import CuratorSidebar from './_components/curator-sidebar';
import ImageLightbox from './_components/image-lightbox';

interface UploadItem {
  id: string;  // Eternal ID - never changes
  file: File;
  preview: string;
  displayName: string;  // For display only
}

export default function AdminUploadPage() {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [archiveNumber, setArchiveNumber] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  // Batch Metadata Edit fields
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [batchCredits, setBatchCredits] = useState('');
  const [batchEventDate, setBatchEventDate] = useState('');
  const [batchCatalogId, setBatchCatalogId] = useState('');
  const [batchMagazineIssue, setBatchMagazineIssue] = useState('');

  // Catalog ID lock state
  const [isCatalogLocked, setIsCatalogLocked] = useState(true);
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false);
  const [showClickHint, setShowClickHint] = useState(false);

  // Validate catalog ID format (weak validation for visual hint only)
  const isValidCatalogFormat = (catalogId: string): boolean => {
    if (!catalogId) return true; // Empty is valid (not submitted yet)
    // Flexible pattern: LMSY-XXX-XXXXXXXX-XXX (allows any format with hyphens)
    return /^LMSY-[A-Z]+-\d{8}-\d{3}$/.test(catalogId);
  };

  // Fetch next catalog ID from API (only when locked)
  useEffect(() => {
    if (!isCatalogLocked || hasManuallyEdited) return; // Don't auto-update if unlocked or manually edited

    const fetchNextCatalogId = async () => {
      try {
        const response = await fetch('/api/admin/upload');
        if (response.ok) {
          const data = await response.json();
          setArchiveNumber(data.next_catalog_id);
        }
      } catch (error) {
        console.error('Failed to fetch next catalog ID:', error);
        setArchiveNumber('');
      }
    };

    fetchNextCatalogId();
  }, [eventDate, isCatalogLocked, hasManuallyEdited]);

  // Handle manual catalog ID edit
  const handleCatalogIdChange = (value: string) => {
    setArchiveNumber(value);
    setHasManuallyEdited(true);
  };

  // Handle click on locked field (shake + hint)
  const handleLockedFieldClick = () => {
    if (isCatalogLocked) {
      setShowClickHint(true);
      setTimeout(() => setShowClickHint(false), 2000);
    }
  };

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

  // Generate preview Catalog ID based on position
  const getPreviewCatalogId = (index: number): string => {
    const dateMatch = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return `LMSY-G-YYYYMMDD-${String(index + 1).padStart(3, '0')}`;

    const [, year, month, day] = dateMatch;
    const compactDate = `${year}${month}${day}`;
    const sequence = String(index + 1).padStart(3, '0');
    return `LMSY-G-${compactDate}-${sequence}`;
  };

  // Fetch existing projects, members, and tags
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [projectsData, membersData, galleryData] = await Promise.all([
        supabase.from('projects').select('*').order('title'),
        supabase.from('profiles').select('*'),
        supabase.from('gallery').select('tag'),
      ]);

      if (projectsData.data) setProjects(projectsData.data);
      if (membersData.data) setMembers(membersData.data);

      // Extract unique tags
      const tags = [...new Set((galleryData.data || []).map(item => item.tag).filter(Boolean))];
      setAvailableTags(tags.sort());
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, []);

  const handleFiles = async (files: File[]) => {
    // Check limit
    if (uploadItems.length + files.length > 50) {
      alert(`⚠ Upload limit exceeded. Maximum 50 images allowed.\nCurrent: ${uploadItems.length}\nAttempted to add: ${files.length}`);
      return;
    }

    // Generate previews with eternal IDs
    const newItems = await Promise.all(
      files.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const fileName = file.name.split('.')[0];
        return {
          id: `eternal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,  // Eternal ID
          file,
          preview,
          displayName: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        };
      })
    );

    setUploadItems(prev => [...prev, ...newItems]);
    setPreviews(prev => [...prev, ...newItems.map(i => i.preview)]);

    // Auto-generate title from first file
    if (files.length > 0 && !title) {
      setTitle(newItems[0].displayName);
    }
  };

  const removeFile = (id: string) => {
    setUploadItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter(i => i.id !== id);
    });
    setPreviews(prev => {
      const item = uploadItems.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return uploadItems.filter(i => i.id !== id).map(i => i.preview);
    });
  };

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput) {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleLightboxNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (direction === 'next' && lightboxIndex !== null && lightboxIndex < uploadItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleUpload = async () => {
    if (uploadItems.length === 0) return;

    setIsUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Upload each file using the new API
      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const file = item.file;

        try {
          // Prepare form data for API
          const formData = new FormData();
          formData.append('file', file);
          formData.append('event_date', batchEventDate || eventDate);

          // Add manual catalog ID if unlocked and manually edited (Astra 馆长的最终解释权)
          if (!isCatalogLocked && hasManuallyEdited && archiveNumber) {
            formData.append('catalog_id', archiveNumber);
          }

          // Only add optional fields if they have values
          if (title) {
            formData.append('caption', i === 0 ? title : `${title} (${i + 1})`);
          }

          if (selectedTags.length > 0) {
            formData.append('tag', selectedTags[0]);
          }

          if (i === 0) {
            formData.append('is_featured', 'true');
          }

          // Upload via API
          const response = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          const result = await response.json();

          if (result.success) {
            successCount++;
            console.log(`✓ Uploaded ${file.name} -> ${result.data.catalog_id}`);
          } else {
            throw new Error('Upload returned unsuccessful');
          }
        } catch (error) {
          failCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${file.name}: ${errorMsg}`);
          console.error(`✗ Failed to upload ${file.name}:`, errorMsg);
        }
      }

      // Show results
      if (successCount === uploadItems.length) {
        alert(`✓ Successfully uploaded all ${successCount} images!`);
      } else if (successCount > 0) {
        alert(`⚠ Partial upload: ${successCount} succeeded, ${failCount} failed.\n\nErrors:\n${errors.join('\n')}`);
      } else {
        alert(`✗ All uploads failed!\n\n${errors.join('\n')}`);
      }

      // Reset form on success
      if (successCount > 0) {
        setUploadItems([]);
        setPreviews([]);
        setSelectedTags([]);
        setSelectedProject(null);
        setSelectedMember(null);
        setTitle('');
        setDescription('');
        setBatchCredits('');
        setBatchEventDate('');
        setBatchCatalogId('');
        setBatchMagazineIssue('');

        // Refresh catalog ID for next upload
        const response = await fetch('/api/admin/upload');
        if (response.ok) {
          const data = await response.json();
          setArchiveNumber(data.next_catalog_id);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black">
      {/* Scanline Effect */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.1) 2px, rgba(255, 255, 255, 0.1) 4px)',
          backgroundSize: '100% 4px',
          animation: 'scanline 8s linear infinite',
        }}
      />

      <style jsx global>{`
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(251, 191, 36, 0.2); }
          50% { border-color: rgba(251, 191, 36, 0.4); }
        }
        @keyframes data-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @keyframes shield-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-2px) rotate(-5deg); }
          75% { transform: translateX(2px) rotate(5deg); }
        }
        .reorder-item {
          cursor: grab;
          user-select: none;
        }
        .reorder-item:active {
          cursor: grabbing;
        }
        .reorder-item img {
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>

      <div className="relative z-10 px-4 py-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-light text-white/90 mb-1">
              Bulk Upload Studio
            </h1>
            <p className="text-white/20 text-[10px] font-mono tracking-wider">
              Curator's Reminder: Respect the shutter's effort.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-white/30">
              {uploadItems.length} / 50 IMAGES
            </div>
            {uploadItems.length > 0 && (
              <div className="text-[8px] font-mono text-lmsy-yellow/60 mt-1">
                Event: {eventDate}
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <UploadZone onDrop={handleDrop} onFileInput={handleFileInput} />

        {/* Main Canvas - Dominant Preview Grid with Right Sidebar */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Editorial Header + Gallery Grid (Col-span-10) */}
          <div className="col-span-12 xl:col-span-10 space-y-6">
            {/* Editorial Header - Curator Sovereignty */}
            <EditorialHeader
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
            />

            {/* Reorderable Gallery Grid */}
            <GalleryGrid
              uploadItems={uploadItems}
              onReorder={setUploadItems}
              onRemove={removeFile}
              onItemClick={setLightboxIndex}
              getPreviewCatalogId={getPreviewCatalogId}
            />
          </div>

          {/* Right: Curator Workbench Sidebar (Col-span-2) */}
          <CuratorSidebar
            // Base Meta
            eventDate={eventDate}
            onEventDateChange={setEventDate}
            selectedProject={selectedProject}
            onProjectChange={setSelectedProject}
            selectedMember={selectedMember}
            onMemberChange={setSelectedMember}
            projects={projects}
            members={members}
            // Archive Data
            showBatchEditor={showBatchEditor}
            onToggleBatchEditor={() => setShowBatchEditor(!showBatchEditor)}
            batchCredits={batchCredits}
            onBatchCreditsChange={setBatchCredits}
            batchCatalogId={batchCatalogId}
            onBatchCatalogIdChange={setBatchCatalogId}
            batchMagazineIssue={batchMagazineIssue}
            onBatchMagazineIssueChange={setBatchMagazineIssue}
            // Archive Spec
            selectedTags={selectedTags}
            onRemoveTag={removeTag}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onTagInputKeyDown={handleTagInputKeyDown}
            // Upload
            isUploading={isUploading}
            uploadItemsCount={uploadItems.length}
            onUpload={handleUpload}
          />
        </div>

        {/* Lightbox */}
        <ImageLightbox
          lightboxIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={handleLightboxNavigate}
          uploadItems={uploadItems}
          getPreviewCatalogId={getPreviewCatalogId}
        />
      </div>
    </div>
  );
}
