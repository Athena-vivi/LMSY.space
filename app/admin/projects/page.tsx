'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Plus, Play, Calendar } from 'lucide-react';
import Image from 'next/image';
import { supabase, type Project } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('release_date', { ascending: false });

    if (!error && data) setProjects(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const categoryColors = {
    series: 'bg-lmsy-yellow/20 text-lmsy-yellow border-lmsy-yellow',
    music: 'bg-lmsy-blue/20 text-lmsy-blue border-lmsy-blue',
    magazine: 'bg-purple-500/20 text-purple-500 border-purple-500',
  };

  const categoryNames = {
    series: 'TV Series',
    music: 'Music Video',
    magazine: 'Magazine',
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
            Projects Management
          </h1>
          <p className="text-muted-foreground">
            Manage TV series, music videos, and magazine features
          </p>
        </div>
        <Button className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group border-2 border-border rounded-lg overflow-hidden hover:border-lmsy-yellow/50 transition-all"
          >
            {/* Cover Image */}
            <div className="relative aspect-video bg-muted">
              {project.cover_url ? (
                <Image
                  src={project.cover_url}
                  alt={project.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}

              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${categoryColors[project.category]}`}>
                  {categoryNames[project.category]}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-white/90 rounded-lg hover:bg-white">
                  <Edit2 className="h-4 w-4 text-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 bg-red-500 rounded-lg hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-serif text-xl font-bold text-foreground mb-2 line-clamp-1">
                {project.title}
              </h3>

              {project.release_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4" />
                  {new Date(project.release_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              )}

              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}

              {project.watch_url && (
                <Button
                  asChild
                  size="sm"
                  className="w-full mt-4 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground"
                >
                  <a href={project.watch_url} target="_blank" rel="noopener noreferrer">
                    <Play className="mr-2 h-3 w-3" />
                    Watch
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg mb-4">No projects yet</p>
          <Button className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add First Project
          </Button>
        </div>
      )}
    </div>
  );
}
