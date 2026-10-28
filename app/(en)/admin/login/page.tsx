'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { useAdminLang } from '@/lib/admin-i18n';

export default function AdminLoginPage() {
  const { signIn, loading } = useAuth();
  const { lang, setLang, t } = useAdminLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);

      // Visual feedback before redirect
      setIsSubmitting(true);

      // Give cookies time to be set, then force redirect
      setTimeout(() => {
        window.location.href = '/admin/projects';
      }, 500);
    } catch (err: any) {
      setError(err.message || t('login.failed'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-root min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Login Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-lmsy-yellow/20 via-lmsy-blue/20 to-lmsy-yellow/20 px-8 py-12 border-b border-border/50">
            <div className="text-center">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-lmsy-yellow/30 to-lmsy-blue/30 mb-6"
              >
                <Shield className="w-10 h-10 text-lmsy-yellow" />
              </motion.div>

              {/* Title */}
              <h1 className="font-serif text-3xl font-bold mb-3">
                <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                  {t('login.title')}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm text-ink-2">
                {t('login.subtitle')}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-ink-2" />
                  {t('login.email')}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@lmsy.space"
                    required
                    className="w-full px-4 py-3 pl-11 bg-background border border-border rounded-lg focus:outline-none focus:border-lmsy-yellow focus:ring-1 focus:ring-lmsy-yellow/20 transition-all"
                    disabled={isSubmitting || loading}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-2" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-ink-2" />
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••••"
                    required
                    className="w-full px-4 py-3 pl-11 pr-12 bg-background border border-border rounded-lg focus:outline-none focus:border-lmsy-yellow focus:ring-1 focus:ring-lmsy-yellow/20 transition-all"
                    disabled={isSubmitting || loading}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-foreground transition-colors"
                    disabled={isSubmitting || loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting || loading || !email || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-foreground font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting || loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-foreground/30 border-t-transparent rounded-full animate-spin" />
                    {isSubmitting && !error ? t('login.entering') : t('login.signingIn')}
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    {t('login.submit')}
                  </>
                )}
              </motion.button>
            </form>

            {/* Language Switcher */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="text-xs text-ink-2">{t('login.langLabel')}</span>
              <button
                type="button"
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="rounded-md border border-white/15 px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:text-ink hover:border-white/30 transition-colors"
              >
                {lang === 'zh' ? 'EN' : '中文'}
              </button>
            </div>

            {/* Back to Home */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="text-sm text-ink-2 hover:text-foreground transition-colors inline-flex items-center gap-2"
              >
                <span>←</span>
                {t('login.back')}
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-muted/30 border-t border-border/50">
            <div className="flex items-center justify-center gap-2 text-xs text-ink-2">
              <Shield className="w-4 h-4" />
              <span>{t('login.protected')}</span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-lmsy-yellow to-lmsy-blue rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-lmsy-blue to-lmsy-yellow rounded-full blur-3xl"
        />
      </motion.div>
    </div>
  );
}
