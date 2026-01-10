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
import StorageWidget from './_components/storage-widget';
import { Toast } from './_components/toast';

interface UploadItem {
  id: string;  // Eternal ID - never changes
  file: File;
  preview: string;
  displayName: string;  // For display only
}

export default function AdminUploadPage() {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
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

  // Quick Project Modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        // 🔒 CRITICAL: Get session for Bearer token
        const { data: { session } } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch('/api/admin/upload', {
          credentials: 'include',
          headers,
        });

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

  // Generate preview Catalog ID based on position with dynamic prefix
  const getPreviewCatalogId = useCallback((index: number): string => {
    // Find selected project to determine category
    const selectedProjectObj = projects.find(p => p.id === selectedProject);

    // Dynamic prefix based on project category
    const prefixMap: Record<string, string> = {
      series: 'STILL',      // TV/Drama
      editorial: 'MAG',     // Magazine
      appearance: 'STAGE',  // Event/Stage
      journal: 'JRN',       // Daily/Travel
      commercial: 'AD',     // Ad/Brand
    };

    const prefix = selectedProjectObj?.category
      ? prefixMap[selectedProjectObj.category] || 'G'
      : 'G'; // Default: Gallery

    const dateMatch = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return `LMSY-${prefix}-YYYYMMDD-${String(index + 1).padStart(3, '0')}`;

    const [, year, month, day] = dateMatch;
    const compactDate = `${year}${month}${day}`;
    const sequence = String(index + 1).padStart(3, '0');
    return `LMSY-${prefix}-${compactDate}-${sequence}`;
  }, [eventDate, selectedProject, projects]);

  // Fetch existing projects, members, and tags
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [projectsData, membersData, galleryData] = await Promise.all([
        // 🔒 CRITICAL: 显式指定 schema
        supabase.schema('lmsy_archive').from('projects').select('*').order('title'),
        supabase.schema('lmsy_archive').from('profiles').select('*'),
        supabase.schema('lmsy_archive').from('gallery').select('tag'),
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

    // Check for duplicates by comparing with existing R2 objects
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Get all existing objects with their sizes
      const checkResponse = await fetch('/api/admin/check-duplicate', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.objects) {
          const existingSizes = new Set(checkData.objects.map((obj: any) => obj.size));

          // Check each file for size match
          const duplicates: string[] = [];
          const nonDuplicateFiles = files.filter(file => {
            if (existingSizes.has(file.size)) {
              duplicates.push(file.name);
              return false;
            }
            return true;
          });

          if (duplicates.length > 0) {
            const duplicateList = duplicates.join('\n• ');
            alert(`⚠️ DUPLICATE DETECTION\n\n以下藏品可能已在馆中 (相同文件大小):\n\n• ${duplicateList}\n\n如需确认是否重复，请使用手动补账功能查看现有馆藏。`);

            // Only add non-duplicate files
            if (nonDuplicateFiles.length === 0) {
              return; // All files are duplicates
            }

            // Update files to only non-duplicates
            files = nonDuplicateFiles;
          }
        }
      }
    } catch (error) {
      console.log('Duplicate check failed, proceeding with upload:', error);
    }

    // Generate previews with eternal UUIDs
    const newItems = await Promise.all(
      files.map(async (file) => {
        const preview = URL.createObjectURL(file);
        const fileName = file.name.split('.')[0];
        return {
          id: crypto.randomUUID(), // Eternal UUID
          file,
          preview,
          displayName: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        };
      })
    );

    setUploadItems(prev => [...prev, ...newItems]);

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
  };

  const addTag = (tag: string) => {
    const MAX_TAGS = 8;
    if (tag && !selectedTags.includes(tag) && selectedTags.length < MAX_TAGS) {
      setSelectedTags(prev => [...prev, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  // Handle project creation from QuickProjectModal
  const handleProjectCreated = (newProject: Project) => {
    // Add new project to the list
    setProjects(prev => [...prev, newProject]);

    // Auto-select the newly created project
    setSelectedProject(newProject.id);

    // Show toast notification
    setToastMessage('New orbit project established and linked.');
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
      // 🔒 CRITICAL: Verify session exists before API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[UPLOAD] No valid session:', sessionError);
        alert('Authentication required. Please log in again.');
        // Force redirect to login page
        window.location.href = '/admin/login';
        setIsUploading(false);
        return;
      }

      console.log('[UPLOAD] Session verified for user:', session.user.email);
      console.log(`[UPLOAD] Starting sequential upload of ${uploadItems.length} files...`);

      // Upload each file using the new API - STOP ON FIRST ERROR
      const uploadResults: any[] = [];
      let totalWebPSize = 0;

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const file = item.file;

        console.log(`[UPLOAD] [${i + 1}/${uploadItems.length}] Processing: ${file.name}`);

        // Prepare form data for API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('event_date', batchEventDate || eventDate);

        // 🔒 CRITICAL: Add project_id if a project is selected
        if (selectedProject) {
          formData.append('project_id', selectedProject);
          console.log(`[UPLOAD] Adding project_id: ${selectedProject}`);
        }

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

        // 🔒 CRITICAL: Add Authorization header with session token
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        // Upload via API
        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });

        // ❌ HTTP ERROR - STOP IMMEDIATELY
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[UPLOAD] ❌ HTTP ERROR Response:', errorData);

          // Build detailed error message for user
          let errorMsg = `❌ UPLOAD FAILED\n\nFile: ${file.name} (${i + 1}/${uploadItems.length})`;
          errorMsg += `\n\nStatus: ${response.status} ${response.statusText}`;

          if (errorData.error) {
            errorMsg += `\n\nError: ${errorData.error}`;
          }
          if (errorData.details) {
            errorMsg += `\n\nDetails: ${errorData.details}`;
          }
          if (errorData.missingVars && errorData.missingVars.length > 0) {
            errorMsg += `\n\n❌ Missing Environment Variables:\n${errorData.missingVars.map((v: string) => `  • ${v}`).join('\n')}`;
            errorMsg += `\n\n⚠️ Please check your .env.local file.`;
          }
          if (errorData.bucket) {
            errorMsg += `\n\nR2 Bucket: ${errorData.bucket}`;
          }
          if (errorData.r2Path) {
            errorMsg += `\n\nR2 Path: ${errorData.r2Path}`;
          }
          if (errorData.uploadedFileUrl) {
            errorMsg += `\n\n⚠️ File was uploaded to R2 but database insert failed.\nURL: ${errorData.uploadedFileUrl}`;
          }

          setIsUploading(false);
          alert(errorMsg);
          return; // STOP IMMEDIATELY
        }

        const result = await response.json();

        // ❌ API RETURNED success: false - STOP IMMEDIATELY
        if (!result.success) {
          console.error('[UPLOAD] ❌ API returned unsuccessful:', result);

          let errorMsg = `❌ UPLOAD FAILED\n\nFile: ${file.name} (${i + 1}/${uploadItems.length})`;
          errorMsg += `\n\nReason: API returned success: false`;
          errorMsg += `\n\nFull Response:\n${JSON.stringify(result, null, 2)}`;

          setIsUploading(false);
          alert(errorMsg);
          return; // STOP IMMEDIATELY
        }

        // Collect result for storage info
        uploadResults.push(result.data);
        if (result.data.metadata?.webpSize) {
          totalWebPSize += result.data.metadata.webpSize;
        }

        console.log(`[UPLOAD] ✅ [${i + 1}/${uploadItems.length}] Successfully uploaded: ${file.name}`);
        console.log(`[UPLOAD]    Catalog ID: ${result.data.catalog_id}`);
        console.log(`[UPLOAD]    URL: ${result.data.image_url}`);
      }

      // ✅ ALL UPLOADS SUCCESSFUL
      console.log('[UPLOAD] ✅✅✅ ALL UPLOADS COMPLETE ✅✅✅');

      // Fetch storage info after upload
      let storageInfo = '';
      try {
        const storageHeaders: Record<string, string> = {};
        if (session?.access_token) {
          storageHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }

        const storageResponse = await fetch('/api/admin/storage', {
          headers: storageHeaders,
          credentials: 'include',
        });

        if (storageResponse.ok) {
          const storageData = await storageResponse.json();
          if (storageData.success) {
            storageInfo = `\n\nStorage: ${storageData.usage.remainingFormatted} / ${storageData.usage.limitGB} GB Remaining`;
          }
        }
      } catch (e) {
        console.log('Failed to fetch storage info');
      }

      // Format WebP size info
      const webpSizeInfo = totalWebPSize > 0
        ? `\n\nOptimized: ${(totalWebPSize / 1024).toFixed(2)} KB WebP Total`
        : '';

      alert(`✅ Successfully uploaded all ${uploadItems.length} images!${webpSizeInfo}${storageInfo}`);

      // Reset form on success
      uploadItems.forEach(item => URL.revokeObjectURL(item.preview));
      setUploadItems([]);
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
      const { data: { session: refreshSession } } = await supabase.auth.getSession();
      const refreshHeaders: Record<string, string> = {};
      if (refreshSession?.access_token) {
        refreshHeaders['Authorization'] = `Bearer ${refreshSession.access_token}`;
      }

      const response = await fetch('/api/admin/upload', {
        credentials: 'include',
        headers: refreshHeaders,
      });

      if (response.ok) {
        const data = await response.json();
        setArchiveNumber(data.next_catalog_id);
        console.log('[UPLOAD] Refreshed catalog ID:', data.next_catalog_id);
      }
    } catch (error) {
      console.error('[UPLOAD] ❌ CATCH BLOCK ERROR:', error);

      let errorMsg = '❌ UPLOAD FAILED\n\nUnexpected error occurred:';
      errorMsg += `\n\n${error instanceof Error ? error.message : String(error)}`;
      if (error instanceof Error && error.stack) {
        console.error('[UPLOAD] Stack:', error.stack);
      }

      alert(errorMsg);
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
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="font-serif text-3xl font-light text-white/90 mb-1">
              Bulk Upload Studio
            </h1>
            <p className="text-white/20 text-[10px] font-mono tracking-wider">
              Curator's Reminder: Respect the shutter's effort.
            </p>
          </div>
          <div className="flex items-center gap-4">
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
            {/* Storage Widget */}
            <div className="w-48">
              <StorageWidget />
            </div>
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
              eventDate={eventDate}
              selectedProject={selectedProject}
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
            onAddTag={addTag}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onTagInputKeyDown={handleTagInputKeyDown}
            // Upload
            isUploading={isUploading}
            uploadItemsCount={uploadItems.length}
            onUpload={handleUpload}
            // Quick Project Creation
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
          uploadItems={uploadItems}
          getPreviewCatalogId={getPreviewCatalogId}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </div>
  );
}
