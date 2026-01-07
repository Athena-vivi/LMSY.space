'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, PenTool, ArrowRight } from 'lucide-react';
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
      title: 'Bulk Upload',
      description: 'Add new images to the archive',
      icon: Upload,
      href: '/admin/upload',
    },
    {
      title: 'Chronicle Edit',
      description: 'Update timeline and events',
      icon: FileText,
      href: '/admin/chronicle',
    },
    {
      title: 'Editorial Studio',
      description: 'Draft exhibition texts',
      icon: PenTool,
      href: '/admin/editorial',
    },
  ];

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
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="relative z-10 space-y-6">
        {/* Console Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 bg-black border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          {/* System Info */}
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-mono tracking-wider">
              <span className="text-white/40">LMSY_SPACE_OS v1.0</span>
              <span className="text-white/20 mx-2">/</span>
              <span className="text-white/40">CURATOR_ASTRA</span>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-6">
            {/* R2 Status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    systemStatus.r2 === 'connected'
                      ? 'bg-green-500 animate-pulse'
                      : systemStatus.r2 === 'error'
                      ? 'bg-red-500'
                      : 'bg-yellow-500 animate-pulse'
                  }`}
                  style={{
                    boxShadow:
                      systemStatus.r2 === 'connected'
                        ? '0 0 8px rgba(34, 197, 94, 0.6)'
                        : 'none',
                  }}
                />
                <span className="text-[10px] font-mono text-white/30 tracking-wider">
                  R2_MEDIA
                </span>
              </div>
              <span
                className={`text-[10px] font-mono tracking-wider ${
                  systemStatus.r2 === 'connected'
                    ? 'text-green-500/80'
                    : systemStatus.r2 === 'error'
                    ? 'text-red-500/80'
                    : 'text-yellow-500/80'
                }`}
              >
                {systemStatus.r2 === 'connected' ? 'ONLINE' : systemStatus.r2 === 'error' ? 'OFFLINE' : 'CHECKING'}
              </span>
            </div>

            {/* Supabase Status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    systemStatus.supabase === 'connected'
                      ? 'bg-green-500 animate-pulse'
                      : systemStatus.supabase === 'error'
                      ? 'bg-red-500'
                      : 'bg-yellow-500 animate-pulse'
                  }`}
                  style={{
                    boxShadow:
                      systemStatus.supabase === 'connected'
                        ? '0 0 8px rgba(34, 197, 94, 0.6)'
                        : 'none',
                  }}
                />
                <span className="text-[10px] font-mono text-white/30 tracking-wider">
                  DB_CORE
                </span>
              </div>
              <span
                className={`text-[10px] font-mono tracking-wider ${
                  systemStatus.supabase === 'connected'
                    ? 'text-green-500/80'
                    : systemStatus.supabase === 'error'
                    ? 'text-red-500/80'
                    : 'text-yellow-500/80'
                }`}
              >
                {systemStatus.supabase === 'connected' ? 'CONNECTED' : systemStatus.supabase === 'error' ? 'FAILED' : 'CHECKING'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Museum Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-6"
        >
          {/* Chronicle Artifacts */}
          <div className="relative">
            <div className="text-[10px] font-mono text-white/20 tracking-widest uppercase mb-3">
              Chronicle Artifacts
            </div>
            <div className="font-serif text-6xl md:text-7xl lg:text-8xl font-light text-white/90 tracking-tight">
              {stats.chronicle}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lmsy-yellow/30 to-transparent" />
          </div>

          {/* Collected Projects */}
          <div className="relative">
            <div className="text-[10px] font-mono text-white/20 tracking-widest uppercase mb-3">
              Collected Projects
            </div>
            <div className="font-serif text-6xl md:text-7xl lg:text-8xl font-light text-white/90 tracking-tight">
              {stats.projects}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lmsy-blue/30 to-transparent" />
          </div>
        </motion.div>

        {/* Studio Portals - Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="group relative bg-black border rounded-lg p-6 overflow-hidden cursor-pointer"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                  whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 },
                  }}
                >
                  {/* Animated gradient border on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(56, 189, 248, 0.1) 50%, rgba(251, 191, 36, 0.1) 100%)',
                      backgroundSize: '200% 200%',
                      animation: 'gradient-flow 3s ease infinite',
                    }}
                  />

                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{
                        boxShadow: '0 0 30px rgba(251, 191, 36, 0.15), inset 0 0 30px rgba(56, 189, 248, 0.05)',
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Icon className="h-5 w-5 text-white/60 group-hover:text-white/90 transition-colors" strokeWidth={1.5} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" strokeWidth={1.5} />
                    </div>

                    <h3 className="font-serif text-lg font-medium text-white/90 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-white/40 font-light">
                      {action.description}
                    </p>
                  </div>

                  {/* Progressively lit border */}
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      border: '1px solid transparent',
                      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(56, 189, 248, 0.3)) border-box',
                      WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
