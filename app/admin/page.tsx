'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, PenTool, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface SystemStatus {
  r2: 'checking' | 'connected' | 'error';
  supabase: 'checking' | 'connected' | 'error';
}

interface CollectionStats {
  gallery: number;
  projects: number;
  chronicle: number;
}

interface IntegrityStatus {
  total: number;
  broken: number;
  valid: number;
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
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    checkSystemStatus();
    fetchCollectionStats();
    fetchIntegrityStatus();
  }, []);

  const checkSystemStatus = async () => {
    // Check R2 configuration and connection (通过 API)
    try {
      const response = await fetch('/api/admin/diagnose/r2');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[R2_MEDIA] HTTP error:', response.status, response.statusText, errorText);
        setSystemStatus(prev => ({
          ...prev,
          r2: 'error',
        }));
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSystemStatus(prev => ({
          ...prev,
          r2: 'connected',
        }));
      } else {
        console.error('[R2_MEDIA] Connection test failed:', data.code, data.error);
        setSystemStatus(prev => ({
          ...prev,
          r2: 'error',
        }));
      }
    } catch (error: any) {
      console.error('[R2_MEDIA] Test error:', error?.message || error);
      setSystemStatus(prev => ({
        ...prev,
        r2: 'error',
      }));
    }

    // Check Supabase connection via API (使用馆长客户端)
    try {
      const response = await fetch('/api/admin/diagnose/db');
      const data = await response.json();
      if (data.success) {
        console.log('[DB_CORE] Connection successful via admin client');
        setSystemStatus(prev => ({
          ...prev,
          supabase: 'connected',
        }));
      } else {
        console.error('[DB_CORE] Connection failed via admin client:', data.error);
        setSystemStatus(prev => ({
          ...prev,
          supabase: 'error',
        }));
      }
    } catch (error: any) {
      console.error('[DB_CORE] Unexpected error:', error?.message || error);
      setSystemStatus(prev => ({
        ...prev,
        supabase: 'error',
      }));
    }
  };

  const fetchCollectionStats = async () => {
    try {
      // 使用馆长客户端 API 获取统计
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();

      setStats({
        gallery: data.gallery || 0,
        projects: data.projects || 0,
        chronicle: data.chronicle || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchIntegrityStatus = async () => {
    try {
      const response = await fetch('/api/admin/integrity');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[INTEGRITY] Failed to fetch status:', response.status, errorData);
        return;
      }
      const data = await response.json();
      if (data.success) {
        setIntegrityStatus(data.status);
      }
    } catch (error) {
      console.error('[INTEGRITY] Network error:', error);
    }
  };

  const verifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/admin/integrity', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to verify integrity');
      }
      const data = await response.json();
      if (data.success) {
        const brokenLinksInfo = data.summary.brokenLinks && data.summary.brokenLinks.length > 0
          ? `\n\nFirst ${data.summary.brokenLinks.length} broken IDs:\n${data.summary.brokenLinks.join(', ')}`
          : '';
        alert(`Integrity Check Complete\n\n${data.message}\n\nTotal: ${data.summary.total}\nValid: ${data.summary.valid}\nBroken: ${data.summary.broken}${brokenLinksInfo}`);
        // Refresh integrity status
        await fetchIntegrityStatus();
        // Refresh collection stats
        await fetchCollectionStats();
      }
    } catch (error) {
      console.error('Failed to verify integrity:', error);
      alert('Failed to verify integrity. Check console for details.');
    } finally {
      setIsVerifying(false);
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

        {/* 🔒 DATA INTEGRITY SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          <motion.div
            onClick={!isVerifying ? verifyIntegrity : undefined}
            className={`group relative bg-black border rounded-lg p-6 overflow-hidden cursor-pointer ${
              isVerifying ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            style={{
              borderColor: integrityStatus?.broken && integrityStatus.broken > 0
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(255, 255, 255, 0.08)',
            }}
            whileHover={!isVerifying ? {
              scale: 1.02,
              transition: { duration: 0.2 },
            } : {}}
          >
            {/* Status-specific background gradient */}
            {integrityStatus?.broken && integrityStatus.broken > 0 ? (
              <div className="absolute inset-0 opacity-5 bg-red-500/10" />
            ) : (
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(56, 189, 248, 0.1) 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'gradient-flow 3s ease infinite',
                  }}
                />
              </div>
            )}

            {/* Content */}
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${
                  integrityStatus?.broken && integrityStatus.broken > 0
                    ? 'bg-red-500/10'
                    : 'bg-white/5 group-hover:bg-white/10'
                } transition-colors`}>
                  {isVerifying ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                  ) : (
                    <ShieldCheck className={`h-5 w-5 ${
                      integrityStatus?.broken && integrityStatus.broken > 0
                        ? 'text-red-400/80'
                        : 'text-white/60 group-hover:text-white/90'
                    } transition-colors`} strokeWidth={1.5} />
                  )}
                </div>
                {integrityStatus?.broken && integrityStatus.broken > 0 && !isVerifying && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] font-mono text-red-400">
                      {integrityStatus.broken} BROKEN
                    </span>
                  </div>
                )}
              </div>

              <h3 className="font-serif text-lg font-medium text-white/90 mb-2">
                Verify Integrity
              </h3>
              <p className="text-sm text-white/40 font-light mb-4">
                Scan all gallery images and mark broken links
              </p>

              {/* Integrity Status */}
              {integrityStatus && (
                <div className="flex items-center gap-6 text-[10px] font-mono">
                  <div>
                    <span className="text-white/30">TOTAL:</span>
                    <span className="ml-1 text-white/60">{integrityStatus.total}</span>
                  </div>
                  <div>
                    <span className="text-white/30">VALID:</span>
                    <span className="ml-1 text-green-400/80">{integrityStatus.valid}</span>
                  </div>
                  {integrityStatus.broken > 0 && (
                    <div>
                      <span className="text-white/30">BROKEN:</span>
                      <span className="ml-1 text-red-400/80">{integrityStatus.broken}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progressively lit border */}
            {!isVerifying && (
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  border: '1px solid transparent',
                  background: integrityStatus?.broken && integrityStatus.broken > 0
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.3))'
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(56, 189, 248, 0.3))',
                  backgroundSize: 'border-box',
                  WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
