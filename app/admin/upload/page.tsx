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

  /**
   * ARCHITECTURE UPGRADE: Client-to-R2 Direct Upload
   *
   * Flow:
   * 1. Request presigned URL from /api/admin/r2/sign
   * 2. Upload file directly to R2 via PUT request
   * 3. Register image in database via /api/admin/upload/register
   *
   * Bypasses Vercel's 4.5MB request size limit
   */
  const handleUpload = async () => {
    if (uploadItems.length === 0) return;

    setIsUploading(true);

    try {
      // 🔒 CRITICAL: Verify session exists before API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[UPLOAD] No valid session:', sessionError);
        alert('Authentication required. Please log in again.');
        window.location.href = '/admin/login';
        setIsUploading(false);
        return;
      }

      console.log('[UPLOAD] 🚀 ARCHITECTURE UPGRADE: Client-to-R2 Direct Upload');
      console.log('[UPLOAD] Session verified for user:', session.user.email);
      console.log(`[UPLOAD] Starting sequential upload of ${uploadItems.length} files...`);

      const authHeaders: Record<string, string> = {};
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Upload each file using three-step flow - STOP ON FIRST ERROR
      const uploadResults: any[] = [];

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const file = item.file;

        console.log(`[UPLOAD] [${i + 1}/${uploadItems.length}] Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // ========================================
        // STEP 1: Determine catalog ID
        // ========================================
        let catalogId: string;

        if (!isCatalogLocked && hasManuallyEdited && archiveNumber) {
          // Manual catalog ID
          catalogId = archiveNumber;
          console.log(`[UPLOAD] Step 1: Using manual catalog ID: ${catalogId}`);
        } else {
          // Generate catalog ID from event date and sequence
          const compactDate = (batchEventDate || eventDate).replace(/-/g, '');

          // Find selected project to determine category prefix
          const selectedProjectObj = projects.find(p => p.id === selectedProject);
          const prefixMap: Record<string, string> = {
            series: 'STILL',
            editorial: 'MAG',
            appearance: 'STAGE',
            journal: 'JRN',
            commercial: 'AD',
          };
          const prefix = selectedProjectObj?.category
            ? prefixMap[selectedProjectObj.category] || 'G'
            : 'G';

          // Generate with sequence (i + 1, starting from 001)
          const sequence = String(i + 1).padStart(3, '0');
          catalogId = `LMSY-${prefix}-${compactDate}-${sequence}`;

          console.log(`[UPLOAD] Step 1: Generated catalog ID: ${catalogId} (prefix: ${prefix})`);
        }

        try {
          // ========================================
          // STEP 2: Convert to WebP (client-side)
          // ========================================
          console.log(`[UPLOAD] Step 2: Converting to WebP...`);

          let webpBlob: Blob;
          try {
            webpBlob = await convertToWebPClient(file, 95);
            console.log(`[UPLOAD] Step 2: ✅ WebP conversion complete (${(webpBlob.size / 1024).toFixed(2)} KB)`);
          } catch (convError) {
            throw new Error(`WebP conversion failed: ${convError instanceof Error ? convError.message : String(convError)}`);
          }

          // ========================================
          // STEP 3: Get Presigned URL from server
          // ========================================
          console.log(`[UPLOAD] Step 3: Requesting presigned URL...`);

          const signResponse = await fetch('/api/admin/r2/sign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            credentials: 'include',
            body: JSON.stringify({
              catalogId,
              contentType: 'image/webp',
            }),
          });

          if (!signResponse.ok) {
            const responseText = await signResponse.text();
            console.error('[UPLOAD] Step 3: ❌ Presigned URL request failed:', {
              status: signResponse.status,
              statusText: signResponse.statusText,
              body: responseText,
            });
            throw new Error(`Presigned URL request failed: ${signResponse.status} ${signResponse.statusText}\n\n${responseText}`);
          }

          const signData = await signResponse.json();

          if (!signData.success) {
            console.error('[UPLOAD] Step 3: ❌ Presigned URL API returned unsuccessful:', signData);
            throw new Error(`Presigned URL API failed: ${signData.error || 'Unknown error'}`);
          }

          console.log(`[UPLOAD] Step 3: ✅ Presigned URL obtained (expires in ${signData.expiresIn}s)`);

          // ========================================
          // STEP 4: Upload directly to R2
          // ========================================
          console.log(`[UPLOAD] Step 4: Uploading directly to R2 (${(webpBlob.size / 1024 / 1024).toFixed(2)} MB)...`);

          const r2UploadStart = Date.now();

          const r2Response = await fetch(signData.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'image/webp',
            },
            body: webpBlob,
          });

          const r2UploadDuration = Date.now() - r2UploadStart;

          if (!r2Response.ok) {
            const responseText = await r2Response.text();
            console.error('[UPLOAD] Step 4: ❌ R2 upload failed:', {
              status: r2Response.status,
              statusText: r2Response.statusText,
              body: responseText,
              duration: `${r2UploadDuration}ms`,
            });
            throw new Error(`R2 upload failed: ${r2Response.status} ${r2Response.statusText}\n\n${responseText}`);
          }

          console.log(`[UPLOAD] Step 4: ✅ Uploaded to R2 successfully (${r2UploadDuration}ms)`);

          // ========================================
          // STEP 5: Register in database
          // ========================================
          console.log(`[UPLOAD] Step 5: Registering in database...`);

          const registerPayload = {
            catalogId,
            imageUrl: signData.publicUrl,
            caption: title ? (i === 0 ? title : `${title} (${i + 1})`) : null,
            tag: selectedTags.length > 0 ? selectedTags[0] : null,
            projectId: selectedProject || null,
            isFeatured: i === 0,
            originalSize: file.size,
          };

          const registerResponse = await fetch('/api/admin/upload/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            credentials: 'include',
            body: JSON.stringify(registerPayload),
          });

          if (!registerResponse.ok) {
            const responseText = await registerResponse.text();
            console.error('[UPLOAD] Step 5: ❌ Database registration failed:', {
              status: registerResponse.status,
              statusText: registerResponse.statusText,
              body: responseText,
            });
            throw new Error(`Database registration failed: ${registerResponse.status} ${registerResponse.statusText}\n\n${responseText}`);
          }

          const registerData = await registerResponse.json();

          if (!registerData.success) {
            console.error('[UPLOAD] Step 5: ❌ Registration API returned unsuccessful:', registerData);
            throw new Error(`Registration API failed: ${registerData.error || 'Unknown error'}`);
          }

          console.log(`[UPLOAD] Step 5: ✅ Registered in database`);
          console.log(`[UPLOAD] ✅ [${i + 1}/${uploadItems.length}] Complete: ${file.name}`);
          console.log(`[UPLOAD]    Catalog ID: ${catalogId}`);
          console.log(`[UPLOAD]    Public URL: ${signData.publicUrl}`);

          // Collect result
          uploadResults.push({
            ...registerData.data,
            metadata: {
              originalSize: file.size,
              webpSize: webpBlob.size,
            },
          });

        } catch (error) {
          // ❌ ERROR - STOP IMMEDIATELY
          console.error(`[UPLOAD] ❌ File [${i + 1}/${uploadItems.length}] FAILED:`, error);

          let errorMsg = `❌ UPLOAD FAILED\n\nFile: ${file.name} (${i + 1}/${uploadItems.length})`;
          errorMsg += `\nCatalog ID: ${catalogId}`;
          errorMsg += `\n\nError: ${error instanceof Error ? error.message : String(error)}`;

          if (error instanceof Error && error.stack) {
            console.error('[UPLOAD] Stack trace:', error.stack);
          }

          setIsUploading(false);
          alert(errorMsg);
          return; // STOP IMMEDIATELY
        }
      }

      // ✅ ALL UPLOADS SUCCESSFUL
      console.log('[UPLOAD] ✅✅✅ ALL UPLOADS COMPLETE ✅✅✅');
      console.log(`[UPLOAD] Successfully processed ${uploadResults.length} files`);

      // Fetch storage info after upload
      let storageInfo = '';
      try {
        const storageResponse = await fetch('/api/admin/storage', {
          headers: authHeaders,
          credentials: 'include',
        });

        if (storageResponse.ok) {
          const storageData = await storageResponse.json();
          if (storageData.success) {
            storageInfo = `\n\nStorage: ${storageData.usage.remainingFormatted} / ${storageData.usage.limitGB} GB Remaining`;
          }
        }
      } catch (e) {
        console.log('[UPLOAD] Failed to fetch storage info:', e);
      }

      // Calculate total compression
      const totalOriginal = uploadResults.reduce((sum, r) => sum + (r.metadata?.originalSize || 0), 0);
      const totalWebP = uploadResults.reduce((sum, r) => sum + (r.metadata?.webpSize || 0), 0);
      const compressionInfo = totalOriginal > 0
        ? `\n\nOriginal: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB\nOptimized: ${(totalWebP / 1024 / 1024).toFixed(2)} MB WebP\nSaved: ${((1 - totalWebP / totalOriginal) * 100).toFixed(1)}%`
        : '';

      alert(`✅ Successfully uploaded all ${uploadItems.length} images!${compressionInfo}${storageInfo}`);

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
      try {
        const refreshResponse = await fetch('/api/admin/upload', {
          credentials: 'include',
          headers: authHeaders,
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setArchiveNumber(data.next_catalog_id);
          console.log('[UPLOAD] Refreshed catalog ID:', data.next_catalog_id);
        }
      } catch (e) {
        console.log('[UPLOAD] Failed to refresh catalog ID:', e);
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

  /**
   * Client-side WebP conversion using Canvas API
   * @param file - Original file
   * @param quality - WebP quality (0-100)
   * @returns WebP Blob
   */
  const convertToWebPClient = async (file: File, quality: number = 95): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // Create canvas with original dimensions
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image to canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0);

          // Convert to WebP
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              resolve(blob);
            },
            'image/webp',
            quality / 100
          );
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      // Load image from object URL
      img.src = objectUrl;
    });
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
