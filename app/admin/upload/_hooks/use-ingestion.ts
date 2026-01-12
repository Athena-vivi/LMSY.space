'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { IngestionMonitorState, UploadStatus, UploadStep } from '../_components/ingestion-monitor';

/**
 * 🔒 USE INGESTION HOOK
 *
 * Interstellar Data Transport System
 *
 * Pure data orchestration layer - no DOM manipulation, no UI logic.
 * Handles the complete upload pipeline: WebP conversion → R2 upload → Database registration
 *
 * @returns {Object} Interface for starting ingestion and monitoring state
 */
export function useIngestion() {
  const [ingestionMonitor, setIngestionMonitor] = useState<IngestionMonitorState>({
    visible: false,
    items: [],
    currentIndex: 0,
    total: 0,
    completed: 0,
    failed: false,
  });

  /**
   * 🔒 STATUS UPDATE HELPER
   * Update individual item status in the monitoring state
   */
  const updateItemStatus = useCallback((
    index: number,
    status: UploadStep,
    currentStep: string,
    error?: string
  ) => {
    setIngestionMonitor(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, status, currentStep, error } : item
      ),
    }));
  }, []);

  /**
   * 🔒 COMPLETION MARKER
   * Mark an item as successfully completed
   */
  const markItemComplete = useCallback((index: number) => {
    setIngestionMonitor(prev => ({
      ...prev,
      completed: prev.completed + 1,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, status: 'success' as UploadStep, currentStep: 'Complete', progress: 100 } : item
      ),
    }));
  }, []);

  /**
   * 🔒 WEBP CONVERSION ENGINE
   * Client-side image format conversion using Canvas API
   *
   * @param file - Original image file
   * @param quality - WebP quality (0-100, default 95)
   * @returns Promise<Blob> - Converted WebP blob
   */
  const convertToWebPClient = useCallback(async (file: File, quality: number = 95): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0);

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

      img.src = objectUrl;
    });
  }, []);

  /**
   * 🚀 INGESTION ENGINE
   * Main upload orchestration function
   *
   * Pipeline:
   * 1. Verify authentication
   * 2. Convert each file to WebP
   * 3. Get presigned URL from server
   * 4. Upload directly to R2 (or fallback to server upload)
   * 5. Register in database
   * 6. Stop on first error
   *
   * @param params - Upload configuration and file data
   * @returns Promise<{ success: boolean; error?: string; results?: any[] }>
   */
  const startIngestion = useCallback(async (params: {
    uploadItems: Array<{
      id: string;
      file: File;
      displayName: string;
    }>;
    eventDate: string;
    title: string;
    selectedTags: string[];
    selectedProject: string | null;
    archiveNumber: string;
    isCatalogLocked: boolean;
    hasManuallyEdited: boolean;
    getProjectById: (id: string) => { category?: string } | undefined;
    onSuccess?: (results: any[]) => void;
    onError?: (error: string) => void;
  }) => {
    const {
      uploadItems,
      eventDate,
      title,
      selectedTags,
      selectedProject,
      archiveNumber,
      isCatalogLocked,
      hasManuallyEdited,
      getProjectById,
      onSuccess,
      onError,
    } = params;

    // Initialize monitoring state
    const initialItems: UploadStatus[] = uploadItems.map(item => ({
      id: item.id,
      fileName: item.displayName,
      preview: '', // Preview will be added by caller
      status: 'pending' as UploadStep,
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
      // 🔒 STEP 0: Verify authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('[INGESTION] No valid session:', sessionError);
        setIngestionMonitor(prev => ({
          ...prev,
          failed: true,
          globalError: 'Authentication required. Please log in again.',
        }));
        return { success: false, error: 'Authentication required' };
      }

      console.log('[INGESTION] 🚀 Pipeline initiated for', uploadItems.length, 'artifacts');

      const authHeaders: Record<string, string> = {};
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const uploadResults: any[] = [];

      // Process each file sequentially
      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        const file = item.file;

        console.log(`[INGESTION] [${i + 1}/${uploadItems.length}] Processing: ${file.name}`);

        // Update current index
        setIngestionMonitor(prev => ({ ...prev, currentIndex: i }));

        // ========================================
        // STEP 1: Determine catalog ID
        // ========================================
        let catalogId: string;

        if (!isCatalogLocked && hasManuallyEdited && archiveNumber) {
          catalogId = archiveNumber;
        } else {
          const compactDate = eventDate.replace(/-/g, '');
          const selectedProjectObj = getProjectById(selectedProject || '');

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

          const sequence = String(i + 1).padStart(3, '0');
          catalogId = `LMSY-${prefix}-${compactDate}-${sequence}`;
        }

        try {
          // ========================================
          // STEP 2: Convert to WebP
          // ========================================
          updateItemStatus(i, 'converting', 'Converting to WebP...');

          let webpBlob: Blob;
          try {
            webpBlob = await convertToWebPClient(file, 95);
            console.log(`[INGESTION] WebP conversion complete:`, (webpBlob.size / 1024).toFixed(2), 'KB');
          } catch (convError) {
            updateItemStatus(i, 'error', 'WebP Conversion Failed', convError instanceof Error ? convError.message : String(convError));
            throw convError;
          }

          // ========================================
          // STEP 3: Get Presigned URL
          // ========================================
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
              console.warn('[INGESTION] Presigned URL request failed, switching to fallback');
              useFallbackUpload = true;
            } else {
              const responseData = await signResponse.json();
              signData = responseData;
              if (!signData!.success) {
                console.warn('[INGESTION] Presigned URL API unsuccessful, switching to fallback');
                useFallbackUpload = true;
              }
            }
          } catch (signError) {
            console.warn('[INGESTION] Presigned URL fetch failed, switching to fallback');
            useFallbackUpload = true;
          }

          if (useFallbackUpload) {
            // ========================================
            // FALLBACK: Server-side upload
            // ========================================
            const formData = new FormData();
            formData.append('file', file);
            formData.append('catalogId', catalogId);
            formData.append('eventDate', eventDate);
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

            if (!fallbackResponse.ok) {
              const responseText = await fallbackResponse.text();
              throw new Error(`Fallback upload failed: ${fallbackResponse.status} ${fallbackResponse.statusText}\n\n${responseText}`);
            }

            const fallbackData = await fallbackResponse.json();

            if (!fallbackData.success) {
              throw new Error(`Fallback upload failed: ${fallbackData.error || 'Unknown error'}`);
            }

            uploadResults.push(fallbackData.data);
            markItemComplete(i);
            continue;
          }

          // ========================================
          // STEP 4: Upload to R2
          // ========================================
          updateItemStatus(i, 'r2_upload', 'Uploading to Cloudflare R2...');

          let useR2Fallback = false;

          try {
            const r2Response = await fetch(signData!.uploadUrl!, {
              method: 'PUT',
              headers: {
                'Content-Type': 'image/webp',
              },
              body: webpBlob,
            });

            if (!r2Response.ok) {
              console.warn('[INGESTION] R2 upload failed, switching to fallback');
              useR2Fallback = true;
            }
          } catch (fetchError) {
            console.warn('[INGESTION] Direct R2 upload failed, switching to fallback');
            useR2Fallback = true;
          }

          if (useR2Fallback) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('catalogId', catalogId);
            formData.append('imageUrl', signData!.publicUrl!);
            formData.append('eventDate', eventDate);
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

            if (!fallbackResponse.ok) {
              const responseText = await fallbackResponse.text();
              throw new Error(`Fallback upload failed: ${fallbackResponse.status} ${fallbackResponse.statusText}\n\n${responseText}`);
            }

            const fallbackData = await fallbackResponse.json();

            if (!fallbackData.success) {
              throw new Error(`Fallback upload failed: ${fallbackData.error || 'Unknown error'}`);
            }

            uploadResults.push(fallbackData.data);
            markItemComplete(i);
            continue;
          }

          // ========================================
          // STEP 5: Register in database
          // ========================================
          updateItemStatus(i, 'db_register', 'Registering in database...');

          const registerPayload = {
            catalogId,
            imageUrl: signData!.publicUrl!,
            eventDate,
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
            throw new Error(`Database registration failed: ${registerResponse.status} ${registerResponse.statusText}\n\n${responseText}`);
          }

          const registerData = await registerResponse.json();

          if (!registerData.success) {
            throw new Error(`Registration API failed: ${registerData.error || 'Unknown error'}`);
          }

          uploadResults.push({
            ...registerData.data,
            metadata: {
              originalSize: file.size,
              webpSize: webpBlob.size,
            },
          });

          markItemComplete(i);

        } catch (error) {
          console.error(`[INGESTION] File [${i + 1}/${uploadItems.length}] FAILED:`, error);

          const errorMessage = error instanceof Error ? error.message : String(error);

          updateItemStatus(i, 'error', 'Upload Failed', errorMessage);
          setIngestionMonitor(prev => ({
            ...prev,
            failed: true,
            globalError: `File ${i + 1}/${uploadItems.length} failed: ${errorMessage}`,
          }));

          if (onError) {
            onError(errorMessage);
          }

          return { success: false, error: errorMessage };
        }
      }

      // ✅ ALL UPLOADS SUCCESSFUL
      console.log('[INGESTION] ✅ Pipeline complete:', uploadResults.length, 'artifacts archived');

      if (onSuccess) {
        onSuccess(uploadResults);
      }

      return { success: true, results: uploadResults };

    } catch (error) {
      console.error('[INGESTION] ❌ Pipeline error:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      setIngestionMonitor(prev => ({
        ...prev,
        failed: true,
        globalError: `Pipeline error: ${errorMessage}`,
      }));

      if (onError) {
        onError(errorMessage);
      }

      return { success: false, error: errorMessage };
    }
  }, [updateItemStatus, markItemComplete, convertToWebPClient]);

  /**
   * 🔒 CLOSE MONITOR
   * Hide the monitoring panel
   */
  const closeMonitor = useCallback(() => {
    setIngestionMonitor(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    // State
    ingestionMonitor,

    // Actions
    startIngestion,
    closeMonitor,
  };
}
