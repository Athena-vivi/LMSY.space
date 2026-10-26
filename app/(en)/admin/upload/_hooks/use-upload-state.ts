'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Project, Member } from '@/lib/supabase/types';

export interface UploadItem {
  id: string;
  file: File;
  preview: string;
  displayName: string;
}

/**
 * 🔒 USE UPLOAD STATE HOOK
 *
 * Manages all upload-related state and operations:
 * - File handling (drop, input, duplicate detection)
 * - Metadata fetching (projects, members, tags)
 * - Catalog ID management
 * - Tag operations
 *
 * Pure data management - no UI logic
 */
export function useUploadState() {
  // ========================================
  // STATE
  // ========================================
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Editor fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Batch metadata
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [batchCredits, setBatchCredits] = useState('');
  const [batchEventDate, setBatchEventDate] = useState('');
  const [batchCatalogId, setBatchCatalogId] = useState('');
  const [batchMagazineIssue, setBatchMagazineIssue] = useState('');

  // Catalog ID lock state
  const [archiveNumber, setArchiveNumber] = useState('');
  const [isCatalogLocked, setIsCatalogLocked] = useState(true);
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false);
  const [showClickHint, setShowClickHint] = useState(false);

  // Date validation state
  const [dateMismatchWarning, setDateMismatchWarning] = useState<string | null>(null);

  // ========================================
  // METADATA FETCHING
  // ========================================
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [projectsData, membersData, galleryData] = await Promise.all([
        supabase.schema('lmsy_archive').from('projects').select('*').order('title'),
        supabase.schema('lmsy_archive').from('profiles').select('*'),
        supabase.schema('lmsy_archive').from('gallery').select('tag'),
      ]);

      if (projectsData.data) setProjects(projectsData.data);
      if (membersData.data) setMembers(membersData.data);

      const tags = [...new Set((galleryData.data || []).map(item => item.tag).filter(Boolean))];
      setAvailableTags(tags.sort());
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Fetch next catalog ID from API
  useEffect(() => {
    if (!isCatalogLocked || hasManuallyEdited) return;

    const fetchNextCatalogId = async () => {
      try {
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

  // ========================================
  // CATALOG ID HELPERS
  // ========================================
  const getPreviewCatalogId = useCallback((index: number): string => {
    const selectedProjectObj = projects.find(p => p.id === selectedProject);
    const prefixMap: Record<string, string> = {
      series: 'STILL',
      editorial: 'MAG',
      appearance: 'STAGE',
      daily: 'DAILY',
      travel: 'TRV',
      commercial: 'AD',
    };

    const prefix = selectedProjectObj?.category
      ? prefixMap[selectedProjectObj.category] || 'G'
      : 'G';

    const dateMatch = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateMatch) return `LMSY-${prefix}-YYYYMMDD-${String(index + 1).padStart(3, '0')}`;

    const [, year, month, day] = dateMatch;
    const compactDate = `${year}${month}${day}`;
    const sequence = String(index + 1).padStart(3, '0');
    return `LMSY-${prefix}-${compactDate}-${sequence}`;
  }, [eventDate, selectedProject, projects]);

  const handleCatalogIdChange = (value: string) => {
    setArchiveNumber(value);
    setHasManuallyEdited(true);
  };

  const handleLockedFieldClick = () => {
    if (isCatalogLocked) {
      setShowClickHint(true);
      setTimeout(() => setShowClickHint(false), 2000);
    }
  };

  // ========================================
  // TAG OPERATIONS
  // ========================================
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

  // ========================================
  // FILE HANDLING
  // ========================================
  const handleFiles = async (files: File[]) => {
    // Check limit
    if (uploadItems.length + files.length > 50) {
      alert(`⚠ Upload limit exceeded. Maximum 50 images allowed.\nCurrent: ${uploadItems.length}\nAttempted to add: ${files.length}`);
      return;
    }

    // Check for duplicates
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const checkResponse = await fetch('/api/admin/check-duplicate', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.success && checkData.objects) {
          const existingSizes = new Set(checkData.objects.map((obj: any) => obj.size));
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

            if (nonDuplicateFiles.length === 0) {
              return;
            }
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
          id: crypto.randomUUID(),
          file,
          preview,
          displayName: fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        };
      })
    );

    setUploadItems(prev => [...prev, ...newItems]);

    // Smart date validation from filenames
    const filenameYears = files.flatMap(file => {
      const matches = file.name.match(/\b(20\d{2})\b/g);
      return matches ? [...new Set(matches.map(m => parseInt(m, 10)))] : [];
    });

    if (filenameYears.length > 0) {
      const yearCounts = filenameYears.reduce((acc, year) => {
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const detectedYear = Object.entries(yearCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

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

  // 🔒 CRITICAL: Only clear form state, DON'T revoke URLs yet
  // URLs should be revoked AFTER IngestionMonitor closes
  const resetFormState = () => {
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
  };

  // 🔒 CRITICAL: Revoke preview URLs after monitor closes
  const cleanupPreviews = (items: UploadItem[]) => {
    items.forEach(item => URL.revokeObjectURL(item.preview));
  };

  // Legacy alias for backward compatibility
  const resetForm = () => {
    resetFormState();
  };

  // ========================================
  // PROJECT MANAGEMENT
  // ========================================
  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [...prev, newProject]);
    setSelectedProject(newProject.id);
    return 'New orbit project established and linked.';
  };

  // ========================================
  // RETURN STATE AND ACTIONS
  // ========================================
  return {
    // State
    uploadItems,
    setUploadItems,
    selectedTags,
    setSelectedTags,
    tagInput,
    setTagInput,
    selectedProject,
    setSelectedProject,
    selectedMember,
    setSelectedMember,
    projects,
    members,
    availableTags,
    isLoading,

    // Editor fields
    title,
    setTitle,
    description,
    setDescription,
    eventDate,
    setEventDate,

    // Batch metadata
    showBatchEditor,
    setShowBatchEditor,
    batchCredits,
    setBatchCredits,
    batchEventDate,
    setBatchEventDate,
    batchCatalogId,
    setBatchCatalogId,
    batchMagazineIssue,
    setBatchMagazineIssue,

    // Catalog ID
    archiveNumber,
    setArchiveNumber,
    isCatalogLocked,
    setIsCatalogLocked,
    hasManuallyEdited,
    showClickHint,

    // Date validation
    dateMismatchWarning,

    // Actions
    getPreviewCatalogId,
    handleCatalogIdChange,
    handleLockedFieldClick,
    addTag,
    removeTag,
    handleFiles,
    removeFile,
    resetForm,
    resetFormState,
    cleanupPreviews,
    handleProjectCreated,
  };
}
