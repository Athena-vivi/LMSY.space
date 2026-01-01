'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Tag, Link2, Eye, Save, Loader2, Images } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/supabase';

export default function AdminUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Fetch existing projects and tags
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [projectsData, galleryData] = await Promise.all([
        supabase.from('projects').select('*').order('title'),
        supabase.from('gallery').select('tag'),
      ]);

      if (projectsData.data) setProjects(projectsData.data);

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
    setUploadedFiles(prev => [...prev, ...files]);

    // Generate previews
    const newPreviews = await Promise.all(
      files.map(file => URL.createObjectURL(file))
    );
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
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

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of uploadedFiles) {
        // Upload image to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        // Insert into gallery table
        const { error: insertError } = await supabase
          .from('gallery')
          .insert({
            image_url: publicUrl,
            tag: selectedTags[0] || null, // Primary tag
            caption: '',
            is_featured: false,
          });

        if (insertError) throw insertError;
      }

      // Reset form
      setUploadedFiles([]);
      setPreviews([]);
      setSelectedTags([]);
      setSelectedProject(null);

      alert('Successfully uploaded all images!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
          Bulk Upload
        </h1>
        <p className="text-muted-foreground">
          Upload multiple images with auto-tagging and project association
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Upload & Configure */}
        <div className="space-y-6">
          {/* Upload Zone */}
          <motion.div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-lmsy-yellow/50 hover:bg-lmsy-yellow/5 transition-all duration-300 cursor-pointer group"
            whileHover={{ scale: 1.01 }}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <motion.div
              animate={{ y: uploadedFiles.length > 0 ? -10 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground group-hover:text-lmsy-yellow transition-colors" />
              <p className="text-lg font-medium text-foreground mb-2">
                Drag & Drop images here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse • Supports JPG, PNG, WebP
              </p>
            </motion.div>
          </motion.div>

          {/* Selected Files */}
          <AnimatePresence>
            {uploadedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Images className="h-4 w-4" />
                  Selected Images ({uploadedFiles.length})
                </h3>

                {/* File Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {uploadedFiles.map((file, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-lg overflow-hidden border border-muted-foreground/20 group"
                    >
                      <Image
                        src={previews[index]}
                        alt={file.name}
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tag Input */}
          <div className="space-y-3">
            <label className="font-medium text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </label>

            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <motion.span
                  key={tag}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-lmsy-yellow/20 text-lmsy-yellow rounded-full text-sm border border-lmsy-yellow/30"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder="Type tag and press Enter..."
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow"
              />

              {/* Tag Suggestions */}
              {tagInput && availableTags.filter(tag =>
                tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                !selectedTags.includes(tag)
              ).length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {availableTags
                    .filter(tag =>
                      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                      !selectedTags.includes(tag)
                    )
                    .slice(0, 5)
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Quick Tags */}
            <div className="flex flex-wrap gap-2">
              {['Fashion', 'BehindTheScene', 'Affair', 'Magazine'].map(tag => (
                <button
                  key={tag}
                  onClick={() => addTag(tag)}
                  className="px-3 py-1 text-xs bg-muted hover:bg-muted-foreground/20 rounded-full border border-border hover:border-lmsy-blue transition-all"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Project Association */}
          <div className="space-y-3">
            <label className="font-medium text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link to Project (Optional)
            </label>

            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-blue"
            >
              <option value="">No project linked</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title} ({project.category})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleUpload}
              disabled={uploadedFiles.length === 0 || isUploading}
              className="flex-1 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground hover:opacity-90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Upload All ({uploadedFiles.length})
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="px-4"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Live Preview</h3>
                <span className="text-xs text-muted-foreground">Frontend Preview</span>
              </div>

              {/* Gallery Preview */}
              <div className="border-2 border-border rounded-lg p-6 bg-card">
                <h4 className="font-serif text-2xl font-bold mb-4">Gallery</h4>
                <div className="columns-2 gap-3 space-y-3">
                  {previews.slice(0, 6).map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-border"
                    >
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
                        {selectedTags[0] && (
                          <span className="absolute top-2 left-2 px-2 py-1 bg-lmsy-yellow text-black text-xs rounded-full font-medium">
                            #{selectedTags[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag Preview */}
              {selectedTags.length > 0 && (
                <div className="border-2 border-border rounded-lg p-6 bg-card">
                  <h4 className="font-medium mb-3">Active Filters</h4>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...selectedTags].map(tag => (
                      <button
                        key={tag}
                        className={`px-4 py-2 text-sm rounded-full border transition-all ${
                          tag === 'All'
                            ? 'bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground border-transparent'
                            : 'bg-muted text-muted-foreground border-border hover:border-lmsy-blue'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Link Preview */}
              {selectedProject && (
                <div className="border-2 border-border rounded-lg p-6 bg-card">
                  <h4 className="font-medium mb-3">Linked Project</h4>
                  {projects.find(p => p.id === selectedProject) && (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <Plus className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {projects.find(p => p.id === selectedProject)?.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {projects.find(p => p.id === selectedProject)?.category}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
