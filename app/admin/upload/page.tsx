'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus, Tag, Link2, Eye, Save, Loader2, Images, Hash, User, Calendar, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2-client';
import { SocialPreview } from '@/components/social-preview';
import { generateArchiveNumber } from '@/lib/archive-number';
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
  const [showPreview, setShowPreview] = useState(false);

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

  // Generate auto number
  useEffect(() => {
    const year = new Date().getFullYear();
    const generated = generateArchiveNumber({
      type: 'G',
      year,
      sequence: 1,
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

    // Auto-generate title from first file
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

        // Generate file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${archiveNumber}-${i + 1}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        // Upload to Cloudflare R2
        const uploadResult = await uploadToR2(file, filePath);

        if (!uploadResult.success || !uploadResult.path) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        // Generate blur data via API
        let blurData: string | undefined;
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          const base64Image = await base64Promise;

          const blurResponse = await fetch('/api/generate-blur', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image }),
          });

          if (blurResponse.ok) {
            const blurResult = await blurResponse.json();
            blurData = blurResult.blurData;
          }
        } catch (blurError) {
          console.warn('Failed to generate blur data:', blurError);
        }

        // Prepare metadata
        const metadata: any = {
          image_url: uploadResult.path,
          title: i === 0 ? title : `${title} (${i + 1})`,
          description,
          tag: selectedTags[0] || null,
          caption: '',
          is_featured: i === 0,
          archive_number: i === 0 ? archiveNumber : undefined,
          event_date: batchEventDate || eventDate,
          project_id: selectedProject,
          member_id: selectedMember,
          ...(blurData && { blur_data: blurData }),
          ...(batchCredits && { credits: batchCredits }),
          ...(batchCatalogId && { catalog_id: batchCatalogId }),
          ...(batchMagazineIssue && { magazine_issue: batchMagazineIssue }),
        };

        // Store in database
        const { error: insertError } = await supabase
          .from('gallery')
          .insert(metadata);

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
      setBatchCredits('');
      setBatchEventDate('');
      setBatchCatalogId('');
      setBatchMagazineIssue('');

      alert('Successfully uploaded all images to R2 with blur placeholders!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading images. Please try again.');
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
      `}</style>

      <div className="relative z-10 px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-light text-white/90 mb-2">
            Bulk Upload Studio
          </h1>
          <p className="text-white/30 text-xs font-mono tracking-wider">
            Curator's Reminder: Respect the shutter's effort.
          </p>
        </div>

        {/* Main Grid - 12 columns */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Panel - Upload Zone (Col-span-7) */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Holographic Archive Number Stamp */}
            <div
              className="relative inline-block px-6 py-3 border rounded-lg"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.3)',
                boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)',
              }}
            >
              <div className="flex items-center gap-4">
                <Hash className="h-4 w-4 text-lmsy-yellow/60" strokeWidth={1.5} />
                <div>
                  <div className="text-[10px] text-white/30 font-mono tracking-widest uppercase mb-1">
                    Archive Number
                  </div>
                  <input
                    type="text"
                    value={archiveNumber}
                    onChange={(e) => setArchiveNumber(e.target.value)}
                    className="bg-transparent font-mono text-lg text-lmsy-yellow/90 focus:outline-none tracking-wider"
                    style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.3)' }}
                  />
                </div>
              </div>
            </div>

            {/* Tech Upload Zone with Dashed Border & Pulse */}
            <motion.div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative border-2 border-dashed rounded-lg p-16 text-center cursor-pointer group transition-all duration-300"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.2)',
                animation: 'pulse-border 3s ease-in-out infinite',
              }}
              whileHover={{
                borderColor: 'rgba(251, 191, 36, 0.4)',
                backgroundColor: 'rgba(251, 191, 36, 0.02)',
              }}
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
                <Upload className="h-12 w-12 mx-auto mb-4 text-white/20 group-hover:text-lmsy-yellow/60 transition-colors" strokeWidth={1.5} />
                <p className="text-sm font-light text-white/40 mb-2">
                  Drag & Drop images here
                </p>
                <p className="text-xs text-white/20 font-mono">
                  or click to browse • JPG, PNG, WebP
                </p>
              </motion.div>
            </motion.div>

            {/* Selected Files Grid */}
            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono text-white/30 tracking-wider flex items-center gap-2">
                      <Images className="h-3 w-3" />
                      SELECTED IMAGES ({uploadedFiles.length})
                    </h3>
                  </div>

                  {/* File Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {uploadedFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative aspect-square rounded overflow-hidden border"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <Image
                          src={previews[index]}
                          alt={file.name}
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-black/80 hover:bg-red-500/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <X className="h-2.5 w-2.5 text-white" strokeWidth={2} />
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-lmsy-yellow/90 backdrop-blur-sm text-black text-[8px] font-bold text-center py-1 font-mono">
                            PRIMARY
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Title Input with Bottom Border */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Collection title..."
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              />
            </div>

            {/* Description with Bottom Border */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Curator's notes..."
                rows={2}
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors resize-none"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              />
            </div>

            {/* Tags with Gradient Text */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono text-white/30 tracking-wider flex items-center gap-2 uppercase">
                <Tag className="h-3 w-3" />
                Tags
              </label>

              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <motion.span
                    key={tag}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(56, 189, 248, 0.1))',
                      borderColor: 'rgba(251, 191, 36, 0.2)',
                      color: 'rgba(251, 191, 36, 0.9)',
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-white/60"
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
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
                  placeholder="Type and press Enter..."
                  className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                />

                {/* Tag Suggestions */}
                {tagInput && availableTags.filter(tag =>
                  tag.toLowerCase().includes(tagInput.toLowerCase()) &&
                  !selectedTags.includes(tag)
                ).length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-black/95 backdrop-blur-xl border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
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
                          className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors text-sm text-white/60 hover:text-white/90"
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
                    className="px-3 py-1 text-xs rounded-full border transition-all text-white/30 hover:text-white/60"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Form Fields (Col-span-5) */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Event Date with Bottom Border */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/30 tracking-wider flex items-center gap-2 uppercase">
                <Calendar className="h-3 w-3" />
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors [color-scheme:dark]"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              />
            </div>

            {/* Project Link with Bottom Border */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/30 tracking-wider flex items-center gap-2 uppercase">
                <Link2 className="h-3 w-3" />
                Link to Project
              </label>
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-blue/60 transition-colors"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <option value="" className="bg-black">No project linked</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id} className="bg-black">
                    {project.title} ({project.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Member Feature with Bottom Border */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/30 tracking-wider flex items-center gap-2 uppercase">
                <User className="h-3 w-3" />
                Feature Member
              </label>
              <select
                value={selectedMember || ''}
                onChange={(e) => setSelectedMember(e.target.value || null)}
                className="w-full px-0 py-2 bg-transparent text-white/90 font-light focus:outline-none border-b focus:border-lmsy-blue/60 transition-colors"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <option value="" className="bg-black">No specific member</option>
                {members.map(member => (
                  <option key={member.id} value={member.id} className="bg-black">
                    {member.name} ({member.name_th})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Metadata Toggle */}
            <div className="border rounded-lg p-4" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
              <button
                onClick={() => setShowBatchEditor(!showBatchEditor)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lmsy-yellow/60" strokeWidth={1.5} />
                  <span className="text-xs font-mono text-white/40 tracking-wider">BATCH METADATA</span>
                </div>
                <motion.div
                  animate={{ rotate: showBatchEditor ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className={`w-4 h-4 text-white/30 ${showBatchEditor ? 'rotate-45' : ''}`} strokeWidth={1.5} />
                </motion.div>
              </button>

              <AnimatePresence>
                {showBatchEditor && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-3"
                  >
                    <p className="text-xs text-white/30 font-light">
                      Apply metadata to all uploaded images at once.
                    </p>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/20 tracking-wider">Credits</label>
                      <input
                        type="text"
                        value={batchCredits}
                        onChange={(e) => setBatchCredits(e.target.value)}
                        placeholder="Source, photographer..."
                        className="w-full px-0 py-2 bg-transparent text-white/70 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors text-xs"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/20 tracking-wider">Event Date Override</label>
                      <input
                        type="date"
                        value={batchEventDate}
                        onChange={(e) => setBatchEventDate(e.target.value)}
                        className="w-full px-0 py-2 bg-transparent text-white/70 font-light focus:outline-none border-b focus:border-lmsy-yellow/60 transition-colors text-xs [color-scheme:dark]"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/20 tracking-wider">Catalog ID</label>
                      <input
                        type="text"
                        value={batchCatalogId}
                        onChange={(e) => setBatchCatalogId(e.target.value)}
                        placeholder="LMSY-G-2025-001"
                        className="w-full px-0 py-2 bg-transparent text-white/70 font-light focus:outline-none border-b focus:border-lmsy-blue/60 transition-colors text-xs"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/20 tracking-wider">Magazine Issue</label>
                      <input
                        type="text"
                        value={batchMagazineIssue}
                        onChange={(e) => setBatchMagazineIssue(e.target.value)}
                        placeholder="Magazine name, issue..."
                        className="w-full px-0 py-2 bg-transparent text-white/70 font-light focus:outline-none border-b focus:border-lmsy-blue/60 transition-colors text-xs"
                        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Upload Button - The Execution */}
            <motion.button
              onClick={handleUpload}
              disabled={uploadedFiles.length === 0 || isUploading}
              className="relative w-full py-4 rounded-lg overflow-hidden font-mono text-sm tracking-wider transition-all duration-300"
              style={{
                background: uploadedFiles.length > 0
                  ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(56, 189, 248, 0.9))'
                  : 'rgba(255, 255, 255, 0.05)',
                color: uploadedFiles.length > 0 ? '#000' : 'rgba(255, 255, 255, 0.2)',
                boxShadow: uploadedFiles.length > 0
                  ? '0 0 30px rgba(251, 191, 36, 0.3), 0 0 60px rgba(56, 189, 248, 0.2)'
                  : 'none',
                cursor: uploadedFiles.length > 0 ? 'pointer' : 'not-allowed',
              }}
              whileHover={uploadedFiles.length > 0 ? { scale: 1.02 } : {}}
              whileTap={uploadedFiles.length > 0 ? { scale: 0.98 } : {}}
            >
              {/* Data Flow Animation */}
              {uploadedFiles.length > 0 && (
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'data-flow 2s linear infinite',
                  }}
                />
              )}

              <div className="relative flex items-center justify-center gap-2">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    UPLOADING...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" strokeWidth={1.5} />
                    UPLOAD ALL ({uploadedFiles.length})
                  </>
                )}
              </div>
            </motion.button>
          </div>
        </div>

        {/* Floating Preview Toggle */}
        <motion.button
          onClick={() => setShowPreview(!showPreview)}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full border transition-all duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Eye className="h-5 w-5 text-white/40" strokeWidth={1.5} />
        </motion.button>

        {/* Frosted Glass Preview Sidebar */}
        <AnimatePresence>
          {showPreview && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPreview(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-96 z-50 overflow-y-auto"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(30px)',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-lg text-white/90">Preview</h3>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <X className="h-4 w-4 text-white/40" strokeWidth={1.5} />
                    </button>
                  </div>

                  <SocialPreview
                    archiveNumber={archiveNumber}
                    title={title || 'Untitled Collection'}
                    description={description || 'No description provided.'}
                    tags={selectedTags}
                    project={projects.find(p => p.id === selectedProject)?.title}
                  />

                  {/* Gallery Preview */}
                  {previews.length > 0 && (
                    <div className="mt-6 border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <h4 className="text-xs font-mono text-white/30 tracking-wider">GALLERY PREVIEW</h4>
                      </div>
                      <div className="p-4">
                        <div className="columns-2 gap-2 space-y-2">
                          {previews.slice(0, 6).map((preview, index) => (
                            <div
                              key={index}
                              className="relative aspect-[3/4] rounded overflow-hidden border"
                              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
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
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
