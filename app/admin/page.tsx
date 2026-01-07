'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, PenTool, Database, Cloud, Shield, ArrowRight, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface SystemStatus {
  r2: 'checking' | 'connected' | 'error';
  supabase: 'checking' | 'connected' | 'error';
}

interface CollectionStats {
  gallery: number;
  projects: number;
  chronicle: number;
}

export default function AdminDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    r2: 'checking',
    supabase: 'checking',
  });
  const [stats, setStats] = useState<CollectionStats>({
    gallery: 0,
    projects: 0,
    chronicle: 0,
  });

  useEffect(() => {
    checkSystemStatus();
    fetchCollectionStats();
  }, []);

  const checkSystemStatus = async () => {
    // Check R2 configuration
    const r2Configured = !!(
      process.env.NEXT_PUBLIC_CDN_URL &&
      process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID
    );

    setSystemStatus(prev => ({
      ...prev,
      r2: r2Configured ? 'connected' : 'error',
    }));

    // Check Supabase connection
    try {
      const { error } = await supabase.from('gallery').select('id').limit(1);
      setSystemStatus(prev => ({
        ...prev,
        supabase: error ? 'error' : 'connected',
      }));
    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        supabase: 'error',
      }));
    }
  };

  const fetchCollectionStats = async () => {
    try {
      const [galleryResult, projectsResult] = await Promise.all([
        supabase.from('gallery').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        gallery: galleryResult.count || 0,
        projects: projectsResult.count || 0,
        chronicle: 0, // Will be implemented when chronicle table exists
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const quickActions = [
    {
      title: 'Upload New Collection',
      description: 'Add new images to the gallery',
      icon: Upload,
      href: '/admin/upload',
      gradient: 'from-lmsy-yellow/20 to-lmsy-yellow/5',
      border: 'border-lmsy-yellow/30',
      text: 'text-lmsy-yellow',
    },
    {
      title: 'Edit Chronicle',
      description: 'Update timeline and events',
      icon: FileText,
      href: '/admin/chronicle',
      gradient: 'from-lmsy-blue/20 to-lmsy-blue/5',
      border: 'border-lmsy-blue/30',
      text: 'text-lmsy-blue',
    },
    {
      title: 'Curatorial Writing',
      description: 'Draft exhibition texts',
      icon: PenTool,
      href: '/admin/editorial',
      gradient: 'from-purple-500/20 to-purple-500/5',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
    },
  ];

  const StatusIcon = ({ status }: { status: SystemStatus[keyof SystemStatus] }) => {
    switch (status) {
      case 'checking':
        return <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-4xl font-bold mb-2 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome back, Curator. The archive awaits your curation.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-lmsy-yellow/10 border border-lmsy-yellow/30 rounded-lg">
          <Shield className="h-5 w-5 text-lmsy-yellow" />
          <span className="text-sm font-medium text-lmsy-yellow">Admin Access</span>
        </div>
      </motion.div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lmsy-yellow/10 rounded-lg">
                <Cloud className="h-5 w-5 text-lmsy-yellow" />
              </div>
              <div>
                <h3 className="font-semibold">Cloudflare R2</h3>
                <p className="text-sm text-muted-foreground">Storage & CDN</p>
              </div>
            </div>
            <StatusIcon status={systemStatus.r2} />
          </div>
          <div className="text-xs text-muted-foreground">
            {systemStatus.r2 === 'connected' && (
              <span>CDN: {process.env.NEXT_PUBLIC_CDN_URL || 'Not configured'}</span>
            )}
            {systemStatus.r2 === 'error' && 'Configuration missing'}
            {systemStatus.r2 === 'checking' && 'Checking connection...'}
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lmsy-blue/10 rounded-lg">
                <Database className="h-5 w-5 text-lmsy-blue" />
              </div>
              <div>
                <h3 className="font-semibold">Supabase Database</h3>
                <p className="text-sm text-muted-foreground">lmsy_archive schema</p>
              </div>
            </div>
            <StatusIcon status={systemStatus.supabase} />
          </div>
          <div className="text-xs text-muted-foreground">
            {systemStatus.supabase === 'connected' && 'Connection stable'}
            {systemStatus.supabase === 'error' && 'Connection failed'}
            {systemStatus.supabase === 'checking' && 'Checking connection...'}
          </div>
        </div>
      </motion.div>

      {/* Collection Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6"
      >
        <h2 className="font-serif text-2xl font-bold mb-6">Collection Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gradient-to-br from-lmsy-yellow/10 to-transparent rounded-lg border border-lmsy-yellow/20">
            <div className="text-4xl font-bold text-lmsy-yellow mb-2">{stats.gallery}</div>
            <div className="text-sm text-muted-foreground">Gallery Items</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-lmsy-blue/10 to-transparent rounded-lg border border-lmsy-blue/20">
            <div className="text-4xl font-bold text-lmsy-blue mb-2">{stats.projects}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg border border-purple-500/20">
            <div className="text-4xl font-bold text-purple-400 mb-2">{stats.chronicle}</div>
            <div className="text-sm text-muted-foreground">Chronicle Events</div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="font-serif text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`group relative bg-gradient-to-br ${action.gradient} border ${action.border} rounded-xl p-6 hover:shadow-lg hover:shadow-${action.text.split('-')[1]}-500/10 transition-all duration-300 cursor-pointer`}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-${action.text.split('-')[1]}-500/10 rounded-lg group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${action.text}`} />
                    </div>
                    <ArrowRight className={`h-5 w-5 ${action.text} opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
