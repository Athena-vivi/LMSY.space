'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import Image from 'next/image';
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

// 🔒 INGESTION MONITOR: Upload status tracking for absolute transparency
type UploadStep = 'pending' | 'converting' | 'r2_upload' | 'db_register' | 'success' | 'error';

interface UploadStatus {
  id: string;
  fileName: string;
  preview: string;
  status: UploadStep;
  currentStep: string;
  error?: string;
  progress: number;
}

interface IngestionMonitorState {
  visible: boolean;
  items: UploadStatus[];
  currentIndex: number;
  total: number;
  completed: number;
  failed: boolean;
  globalError?: string;
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

  // 🔒 INGESTION MONITOR: Absolute transparency state
  const [ingestionMonitor, setIngestionMonitor] = useState<IngestionMonitorState>({
    visible: false,
    items: [],
    currentIndex: 0,
    total: 0,
    completed: 0,
    failed: false,
  });

  // New fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [archiveNumber, setArchiveNumber] = useState('');
  // 🔒 CRITICAL: Default to empty string - forces curator to actively choose date
  const [eventDate, setEventDate] = useState('');

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

  // 🔒 Date validation state - detect year mismatch from filenames
  const [dateMismatchWarning, setDateMismatchWarning] = useState<string | null>(null);

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

    // 🔒 SMART DATE VALIDATION: Detect year mismatch from filenames
    // Extract years from filenames (patterns: 2024, 2023, etc.)
    const filenameYears = files.flatMap(file => {
      const matches = file.name.match(/\b(20\d{2})\b/g);
      return matches ? [...new Set(matches.map(m => parseInt(m, 10)))] : [];
    });

    if (filenameYears.length > 0) {
      // Get most common year from filenames
      const yearCounts = filenameYears.reduce((acc, year) => {
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const detectedYear = Object.entries(yearCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

      // Check if selected event year differs from detected year
      if (eventDate) {
        const eventYear = new Date(eventDate).getFullYear();
        const yearDiff = Math.abs(parseInt(detectedYear) - eventYear);

        if (yearDiff > 0) {
          setDateMismatchWarning(
            `Filenames suggest ${detectedYear}, but Event Date is ${eventYear}`
          );
        } else {
          setDateMismatchWarning(null);
        }
      } else {
        // No event date selected, suggest detected year
        setDateMismatchWarning(`Filenames suggest ${detectedYear} - please set Event Date`);
      }
    } else {
      setDateMismatchWarning(null);
    }

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

    // 🔒 DATE VALIDATION: Check if event date is selected
    if (!eventDate && !batchEventDate) {
      alert('⚠️ DATE REQUIRED\n\nPlease select an Event Date before uploading.\n\nThis ensures proper archival organization.');
      return;
    }

    // 🔒 UPLOAD CONFIRMATION: Show non-intrusive confirmation
    const targetDate = batchEventDate || eventDate;
    const formattedDate = targetDate ? new Date(targetDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : 'UNKNOWN DATE';

    const confirmed = confirm(
      `Ready to archive ${uploadItems.length} artifact${uploadItems.length > 1 ? 's' : ''} into ${formattedDate}?\n\n` +
      `• Files: ${uploadItems.length}\n` +
      `• Event Date: ${formattedDate}\n` +
      (selectedProject ? `• Project: ${projects.find(p => p.id === selectedProject)?.title || 'Unknown'}\n` : '') +
      (dateMismatchWarning ? `\n⚠️ ${dateMismatchWarning}` : '') +
      `\n\nProceed?`
    );

    if (!confirmed) {
      console.log('[UPLOAD] Cancelled by curator');
      return;
    }

    setIsUploading(true);

    // 🔒 INGESTION MONITOR: Initialize monitoring state
    const initialItems: UploadStatus[] = uploadItems.map(item => ({
      id: item.id,
      fileName: item.displayName,
      preview: item.preview,
      status: 'pending',
      currentStep: 'Waiting...',
      progress: 0,
    }));

    setIngestionMonitor({
      visible: true,
      items: initialItems,
      currentIndex: 0,
      total: uploadItems.length,
      completed: 0,
      failed: false,
    });

    try {
      // 🔒 CRITICAL: Verify session exists before API calls
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[UPLOAD] No valid session:', sessionError);
        setIngestionMonitor(prev => ({
          ...prev,
          failed: true,
          globalError: 'Authentication required. Please log in again.',
        }));
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

      // 🔒 INGESTION MONITOR: Helper function to update item status
      const updateItemStatus = (index: number, status: UploadStep, currentStep: string, error?: string) => {
        setIngestionMonitor(prev => ({
          ...prev,
          items: prev.items.map((item, i) =>
            i === index ? { ...item, status, currentStep, error } : item
          ),
        }));
      };

      const markItemComplete = (index: number) => {
        setIngestionMonitor(prev => ({
          ...prev,
          completed: prev.completed + 1,
          items: prev.items.map((item, i) =>
            i === index ? { ...item, status: 'success' as UploadStep, currentStep: 'Complete', progress: 100 } : item
          ),
        }));
      };

      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const file = item.file;

        console.log(`[UPLOAD] [${i + 1}/${uploadItems.length}] Processing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // 🔒 INGESTION MONITOR: Update current index
        setIngestionMonitor(prev => ({ ...prev, currentIndex: i }));

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

          // 🔒 INGESTION MONITOR: Update status
          updateItemStatus(i, 'converting', 'Converting to WebP...');

          let webpBlob: Blob;
          try {
            webpBlob = await convertToWebPClient(file, 95);
            console.log(`[UPLOAD] Step 2: ✅ WebP conversion complete (${(webpBlob.size / 1024).toFixed(2)} KB)`);
          } catch (convError) {
            // 🔒 INGESTION MONITOR: Mark error
            updateItemStatus(i, 'error', 'WebP Conversion Failed', convError instanceof Error ? convError.message : String(convError));
            throw new Error(`WebP conversion failed: ${convError instanceof Error ? convError.message : String(convError)}`);
          }

          // ========================================
          // STEP 3: Get Presigned URL from server
          // ========================================
          console.log(`[UPLOAD] Step 3: Requesting presigned URL...`);

          let signData: { success: boolean; uploadUrl?: string; publicUrl?: string; expiresIn?: number; r2Path?: string; error?: string } | null = null;
          let useFallbackUpload = false;

          try {
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
              console.warn('[UPLOAD] Step 3: 🔄 Switching to server-side fallback upload...');
              useFallbackUpload = true;
            } else {
              const responseData = await signResponse.json();
              signData = responseData;

              if (!signData!.success) {
                console.error('[UPLOAD] Step 3: ❌ Presigned URL API returned unsuccessful:', signData);
                console.warn('[UPLOAD] Step 3: 🔄 Switching to server-side fallback upload...');
                useFallbackUpload = true;
              }
            }

            if (!useFallbackUpload && signData) {
              console.log(`[UPLOAD] Step 3: ✅ Presigned URL obtained (expires in ${signData.expiresIn}s)`);
              console.log(`[UPLOAD]    Upload URL: ${signData.uploadUrl?.substring(0, 80)}...`);
              console.log(`[UPLOAD]    Public URL: ${signData!.publicUrl}`);
            }
          } catch (signError) {
            console.error('[UPLOAD] Step 3: ❌ Presigned URL fetch failed:', {
              error: signError,
              name: signError instanceof Error ? signError.name : 'Unknown',
              message: signError instanceof Error ? signError.message : String(signError),
            });
            console.warn('[UPLOAD] Step 3: 🔄 Switching to server-side fallback upload...');
            useFallbackUpload = true;
          }

          if (useFallbackUpload) {
            // ========================================
            // FALLBACK: Server-side upload (no presigned URL needed)
            // ========================================
            console.log('[UPLOAD] Step 3b: Uploading via server fallback endpoint...');

            const fallbackStartTime = Date.now();

            // Prepare FormData for fallback upload
            const formData = new FormData();
            formData.append('file', file); // Original file, server will convert to WebP
            formData.append('catalogId', catalogId);
            formData.append('eventDate', targetDate); // 🔒 CRITICAL: Pass validated event date
            formData.append('caption', title ? (i === 0 ? title : `${title} (${i + 1})`) : '');
            formData.append('tag', selectedTags.length > 0 ? selectedTags[0] : '');
            formData.append('projectId', selectedProject || '');
            formData.append('isFeatured', String(i === 0));
            formData.append('originalSize', String(file.size));

            const fallbackResponse = await fetch('/api/admin/upload/fallback', {
              method: 'POST',
              headers: authHeaders,
              credentials: 'include',
              body: formData,
            });

            const fallbackDuration = Date.now() - fallbackStartTime;

            if (!fallbackResponse.ok) {
              const responseText = await fallbackResponse.text();
              console.error('[UPLOAD] Step 3b: ❌ Fallback upload failed:', {
                status: fallbackResponse.status,
                statusText: fallbackResponse.statusText,
                body: responseText,
              });
              throw new Error(`Fallback upload failed: ${fallbackResponse.status} ${fallbackResponse.statusText}\n\n${responseText}`);
            }

            const fallbackData = await fallbackResponse.json();

            if (!fallbackData.success) {
              console.error('[UPLOAD] Step 3b: ❌ Fallback API returned unsuccessful:', fallbackData);
              throw new Error(`Fallback upload failed: ${fallbackData.error || 'Unknown error'}`);
            }

            console.log(`[UPLOAD] Step 3b: ✅ Fallback upload complete (${fallbackDuration}ms)`);

            // Skip to next iteration (fallback handles database registration too)
            uploadResults.push(fallbackData.data);

            // 🔒 INGESTION MONITOR: Mark complete
            markItemComplete(i);
            continue;
          }

          // ========================================
          // STEP 4: Upload directly to R2
          // ========================================
          console.log(`[UPLOAD] Step 4: Uploading directly to R2 (${(webpBlob.size / 1024 / 1024).toFixed(2)} MB)...`);

          // 🔒 INGESTION MONITOR: Update status
          updateItemStatus(i, 'r2_upload', 'Uploading to Cloudflare R2...');

          const r2UploadStart = Date.now();

          let useR2Fallback = false;

          try {
            const r2Response = await fetch(signData!.uploadUrl!, {
              method: 'PUT',
              headers: {
                'Content-Type': 'image/webp',
              },
              body: webpBlob,
            });

            // Check if R2 upload succeeded
            if (!r2Response.ok) {
              const responseText = await r2Response.text();
              console.error('[UPLOAD] Step 4: ❌ R2 upload failed (HTTP error):', {
                status: r2Response.status,
                statusText: r2Response.statusText,
                body: responseText,
              });
              console.warn('[UPLOAD] Step 4: 🔄 Switching to server-side fallback upload...');
              useR2Fallback = true;
            }
          } catch (fetchError) {
            console.error('[UPLOAD] Step 4: ❌ Direct R2 upload failed (network error):', {
              error: fetchError,
              name: fetchError instanceof Error ? fetchError.name : 'Unknown',
              message: fetchError instanceof Error ? fetchError.message : String(fetchError),
              uploadUrl: signData!.uploadUrl!.substring(0, 100) + '...',
              blobSize: webpBlob.size,
            });
            console.warn('[UPLOAD] Step 4: 🔄 Switching to server-side fallback upload...');
            useR2Fallback = true;
          }

          if (useR2Fallback) {
            // ========================================
            // FALLBACK: Server-side upload
            // ========================================
            console.log('[UPLOAD] Step 4b: Uploading via server fallback endpoint...');

            const fallbackStartTime = Date.now();

            // Prepare FormData for fallback upload
            // 🔒 CRITICAL: All required fields must be present - NO NULL VALUES
            const formData = new FormData();
            formData.append('file', file); // Original file, server will convert to WebP
            formData.append('catalogId', catalogId);
            formData.append('imageUrl', signData!.publicUrl!); // Pre-determined public URL
            formData.append('eventDate', targetDate); // 🔒 CRITICAL: Must pass event_date
            formData.append('caption', title ? (i === 0 ? title : `${title} (${i + 1})`) : '');
            formData.append('tag', selectedTags.length > 0 ? selectedTags[0] : '');
            formData.append('projectId', selectedProject || '');
            formData.append('isFeatured', String(i === 0));
            formData.append('originalSize', String(file.size));

            const fallbackResponse = await fetch('/api/admin/upload/fallback', {
              method: 'POST',
              headers: authHeaders,
              credentials: 'include',
              body: formData,
            });

            const fallbackDuration = Date.now() - fallbackStartTime;

            if (!fallbackResponse.ok) {
              const responseText = await fallbackResponse.text();
              console.error('[UPLOAD] Step 4b: ❌ Fallback upload failed:', {
                status: fallbackResponse.status,
                statusText: fallbackResponse.statusText,
                body: responseText,
              });
              throw new Error(`Fallback upload failed: ${fallbackResponse.status} ${fallbackResponse.statusText}\n\n${responseText}`);
            }

            const fallbackData = await fallbackResponse.json();

            if (!fallbackData.success) {
              console.error('[UPLOAD] Step 4b: ❌ Fallback API returned unsuccessful:', fallbackData);
              throw new Error(`Fallback upload failed: ${fallbackData.error || 'Unknown error'}`);
            }

            console.log(`[UPLOAD] Step 4b: ✅ Fallback upload complete (${fallbackDuration}ms)`);

            // Skip to next iteration (fallback handles database registration too)
            uploadResults.push(fallbackData.data);

            // 🔒 INGESTION MONITOR: Mark complete
            markItemComplete(i);
            continue;
          }

          const r2UploadDuration = Date.now() - r2UploadStart;
          console.log(`[UPLOAD] Step 4: ✅ Uploaded to R2 successfully (${r2UploadDuration}ms)`);

          // ========================================
          // STEP 5: Register in database
          // ========================================
          console.log(`[UPLOAD] Step 5: Registering in database...`);

          // 🔒 INGESTION MONITOR: Update status
          updateItemStatus(i, 'db_register', 'Registering in database...');

          const registerPayload = {
            catalogId,
            imageUrl: signData!.publicUrl!,
            eventDate: targetDate, // 🔒 CRITICAL: Pass validated event date
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
          console.log(`[UPLOAD]    Public URL: ${signData!.publicUrl}`);

          // 🔒 ARCHIVE_SUCCESS LOG: 零误差上传确认
          const r2Path = `magazines/${new Date(targetDate).getFullYear()}/${catalogId}.webp`;
          console.log(`[ARCHIVE_SUCCESS] Physical: ${r2Path} | Logical: ${catalogId}`);

          // Collect result
          uploadResults.push({
            ...registerData.data,
            metadata: {
              originalSize: file.size,
              webpSize: webpBlob.size,
            },
          });

          // 🔒 INGESTION MONITOR: Mark complete
          markItemComplete(i);

        } catch (error) {
          // ❌ ERROR - STOP IMMEDIATELY
          console.error(`[UPLOAD] ❌ File [${i + 1}/${uploadItems.length}] FAILED:`, error);

          const errorMessage = error instanceof Error ? error.message : String(error);

          // 🔒 INGESTION MONITOR: Mark error
          updateItemStatus(i, 'error', 'Upload Failed', errorMessage);
          setIngestionMonitor(prev => ({
            ...prev,
            failed: true,
            globalError: `File ${i + 1}/${uploadItems.length} failed: ${errorMessage}`,
          }));

          if (error instanceof Error && error.stack) {
            console.error('[UPLOAD] Stack trace:', error.stack);
          }

          setIsUploading(false);
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
      const img = new window.Image();

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
            // Date validation warning
            dateMismatchWarning={dateMismatchWarning}
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

        {/* 🔒 INGESTION MONITOR: Absolute Transparency Upload Panel */}
        {ingestionMonitor.visible && (
          <IngestionMonitor
            state={ingestionMonitor}
            onClose={() => setIngestionMonitor(prev => ({ ...prev, visible: false }))}
            onRetry={handleUpload}
          />
        )}
      </div>
    </div>
  );
}

// 🔒 INGESTION MONITOR COMPONENT: Immersive Upload Progress Panel
function IngestionMonitor({
  state,
  onClose,
  onRetry,
}: {
  state: IngestionMonitorState;
  onClose: () => void;
  onRetry: () => void;
}) {
  const currentItem = state.items[state.currentIndex];

  // Calculate progress percentage
  const progress = state.total > 0 ? (state.completed / state.total) * 100 : 0;

  // Check if all complete
  const allComplete = state.completed === state.total && state.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="w-full max-w-6xl mx-auto px-6">
        {/* Header: SYNCHRONIZING_ORBIT... */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-white/90 mb-4">
            {allComplete ? (
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                ARCHIVE_SYNC_SUCCESSFUL
              </span>
            ) : (
              <>
                <span className="text-lmsy-yellow/80">SYNCHRONIZING</span>
                <span className="text-white/50">_</span>
                <span className="text-lmsy-blue/80">ORBIT</span>
                <span className="animate-pulse">...</span>
              </>
            )}
          </h1>
          <p className="font-mono text-xs text-white/30 tracking-[0.3em]">
            INGESTION_MONITOR_v1.0 :: ABSOLUTE_TRANSPARENCY
          </p>
        </motion.div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left: Current Image Thumbnail */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]">
              {currentItem ? (
                <Image
                  src={currentItem.preview}
                  alt={currentItem.fileName}
                  fill
                  className="object-cover"
                />
              ) : allComplete ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">✨</div>
                    <p className="font-mono text-sm text-lmsy-yellow/60">
                      ALL_ARTIFACTS_PRESERVED
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-pulse">
                    <div className="w-16 h-16 border-4 border-lmsy-yellow/20 border-t-lmsy-yellow rounded-full animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Current File Name */}
            {currentItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center"
              >
                <p className="font-mono text-sm text-white/60 break-all">
                  {currentItem.fileName}
                </p>
                <p className="font-mono text-xs text-white/30 mt-1">
                  [{state.currentIndex + 1} / {state.total}]
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Right: Lifecycle Checklist */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="font-mono text-xs text-white/40 tracking-[0.2em] uppercase mb-6">
              Lifecycle_Checklist
            </h3>

            {/* Steps */}
            {[
              { key: 'converting', label: 'WebP Conversion', icon: '🔄' },
              { key: 'r2_upload', label: 'R2 Upload', icon: '☁️' },
              { key: 'db_register', label: 'Database Record', icon: '💾' },
            ].map((step) => {
              const isActive = currentItem?.status === step.key;
              const isComplete = currentItem?.status === 'success' ||
                               (state.items.some(item => item.status === 'success'));
              const isPending = currentItem?.status === 'pending' && step.key !== 'pending';

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (step.key === 'converting' ? 0 : step.key === 'r2_upload' ? 0.1 : 0.2) }}
                  className={`
                    p-4 rounded-lg border transition-all duration-300
                    ${isActive
                      ? 'border-lmsy-yellow/40 bg-lmsy-yellow/5 shadow-lg shadow-lmsy-yellow/10'
                      : isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register')
                      ? 'border-lmsy-blue/20 bg-lmsy-blue/5'
                      : 'border-white/5 bg-white/[0.02]'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`
                      text-2xl transition-all duration-300
                      ${isActive ? 'animate-spin' : ''}
                      ${isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register') ? 'opacity-100' : 'opacity-30'}
                    `}>
                      {isActive ? '⚙️' : isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register') ? '✅' : step.icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1">
                      <p className={`font-mono text-sm ${
                        isActive ? 'text-lmsy-yellow/80' : isComplete || (currentItem?.status === 'db_register' && step.key !== 'db_register') ? 'text-lmsy-blue/60' : 'text-white/40'
                      }`}>
                        {step.label}
                      </p>
                      {isActive && currentItem?.currentStep && (
                        <p className="font-mono text-xs text-white/30 mt-1">
                          {currentItem.currentStep}
                        </p>
                      )}
                    </div>

                    {/* Status Indicator */}
                    {isActive && (
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-lmsy-yellow"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Error Display */}
            {state.failed && state.globalError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border-2 border-red-500/40 bg-red-950/20"
              >
                <p className="font-mono text-xs text-red-400/60 uppercase mb-2">ERROR_DETECTED</p>
                <p className="font-mono text-sm text-red-300 break-all">
                  {state.globalError}
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Digital Pulse Progress Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-1">
            {state.items.map((item, index) => {
              const isComplete = item.status === 'success';
              const isCurrent = index === state.currentIndex;
              const isError = item.status === 'error';

              return (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`
                    w-2 h-8 rounded-sm transition-all duration-500
                    ${isComplete
                      ? 'bg-gradient-to-t from-lmsy-yellow to-lmsy-blue shadow-lg shadow-lmsy-yellow/30'
                      : isCurrent
                      ? 'bg-lmsy-yellow/60 animate-pulse'
                      : isError
                      ? 'bg-red-500/60'
                      : 'bg-white/5'
                    }
                  `}
                />
              );
            })}
          </div>

          {/* Progress Text */}
          <div className="text-center mt-4">
            <p className="font-mono text-xs text-white/40">
              {state.completed} / {state.total} ARTIFACTS{' '}
              <span className="text-lmsy-yellow/60">
                {progress.toFixed(0)}%
              </span>
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-4"
        >
          {/* Close Button (only when not failed) */}
          {!state.failed && (
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="font-mono text-sm text-white/60">
                [ CLOSE ]
              </span>
            </button>
          )}

          {/* Retry Button (only when failed) */}
          {state.failed && (
            <button
              onClick={onRetry}
              className="flex items-center gap-3 px-8 py-3 rounded-lg border border-red-500/40 bg-red-950/20 hover:bg-red-950/30 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span className="font-mono text-sm text-red-400">
                [ RETRY_SIGNAL ]
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
