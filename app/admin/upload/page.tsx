'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Tag, Link2, Eye, Save, Loader2, Images, Hash, User, Calendar } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { SocialPreview } from '@/components/social-preview';
import { generateArchiveNumber, getTypeName, parseArchiveNumber } from '@/lib/archive-number';
import type { Project } from '@/lib/supabase';

interface Member {
  id: string;
  name: string;
  name_th: string;
}

export default function AdminUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // 新增字段
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [archiveNumber, setArchiveNumber] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  // 生成自动编号
  useEffect(() => {
    const year = new Date().getFullYear();
    const generated = generateArchiveNumber({
      type: 'G', // Gallery
      year,
      sequence: 1, // 实际应该从数据库获取
    });
    setArchiveNumber(generated);
  }, []);

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
      if (membersData.data) setMembers(membersData.data as Member[]);

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

    // 如果是第一张图片，自动生成标题
    if (files.length > 0 && !title) {
      const fileName = files[0].name.split('.')[0];
      setTitle(fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    }
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
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];

        // Upload image to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${archiveNumber}-${i + 1}.${fileExt}`;
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
            title: i === 0 ? title : `${title} (${i + 1})`,
            description,
            tag: selectedTags[0] || null,
            caption: '',
            is_featured: i === 0,
            archive_number: i === 0 ? archiveNumber : undefined,
            event_date: eventDate,
            project_id: selectedProject,
            member_id: selectedMember,
          });

        if (insertError) throw insertError;
      }

      // Reset form
      setUploadedFiles([]);
      setPreviews([]);
      setSelectedTags([]);
      setSelectedProject(null);
      setSelectedMember(null);
      setTitle('');
      setDescription('');
      setArchiveNumber(generateArchiveNumber({ type: 'G', sequence: 1 }));

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
          Curated Upload
        </h1>
        <p className="text-muted-foreground">
          Upload with automatic archive numbering, project/member linking, and social media preview
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Panel - Upload & Configure */}
        <div className="xl:col-span-2 space-y-6">
          {/* Archive Number Display */}
          <div className="border-2 border-lmsy-yellow/30 bg-lmsy-yellow/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="font-medium text-foreground flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Archive Number
              </label>
              <span className="text-xs text-muted-foreground">Auto-generated</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={archiveNumber}
                onChange={(e) => setArchiveNumber(e.target.value)}
                className="flex-1 px-4 py-3 bg-background border-2 border-lmsy-yellow rounded-lg font-mono text-lg text-lmsy-yellow focus:outline-none focus:border-lmsy-yellow"
                placeholder="LMSY-G-2024-001"
              />
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="font-mono text-sm">Gallery</div>
              </div>
            </div>
          </div>

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
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
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
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-lmsy-yellow text-black text-[10px] font-bold text-center py-0.5">
                          PRIMARY
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-medium text-foreground">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Christmas Photoshoot 2024"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Curator's note about this collection..."
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-yellow resize-none"
            />
          </div>

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
              {['Fashion', 'BehindTheScene', 'Affair', 'Magazine', 'Event'].map(tag => (
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

          {/* Project & Member Association */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project */}
            <div className="space-y-2">
              <label className="font-medium text-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Link to Project
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

            {/* Member */}
            <div className="space-y-2">
              <label className="font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Feature Member
              </label>
              <select
                value={selectedMember || ''}
                onChange={(e) => setSelectedMember(e.target.value || null)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-lmsy-blue"
              >
                <option value="">No specific member</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.name_th})
                  </option>
                ))}
              </select>
            </div>
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

        {/* Right Panel - Social Media Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <SocialPreview
                archiveNumber={archiveNumber}
                title={title || 'Untitled Collection'}
                description={description || 'No description provided.'}
                tags={selectedTags}
                project={projects.find(p => p.id === selectedProject)?.title}
              />

              {/* Gallery Preview */}
              {previews.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <h4 className="font-medium text-sm">Gallery Preview</h4>
                  </div>
                  <div className="p-4 bg-card">
                    <div className="columns-2 gap-2 space-y-2">
                      {previews.slice(0, 6).map((preview, index) => (
                        <div
                          key={index}
                          className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border"
                        >
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
