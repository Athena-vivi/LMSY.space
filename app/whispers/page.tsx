'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface Message {
  id: string;
  content: string;
  author: string;
  location: string | null;
  color_pref: 'yellow' | 'blue';
  created_at: string;
}

export default function WhispersPage() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    author: '',
    location: '',
    color_pref: 'yellow' as 'yellow' | 'blue',
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    content: false,
    author: false,
  });
  const [shakeFields, setShakeFields] = useState({
    content: false,
    author: false,
  });

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark" || (theme === "system" && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Body lock when form is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showForm]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/whispers?limit=100');
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Custom validation
    const errors = {
      content: !formData.content.trim(),
      author: !formData.author.trim(),
    };

    setValidationErrors(errors);

    // Trigger shake animation for invalid fields
    if (errors.content || errors.author) {
      setShakeFields({ content: true, author: true });
      setTimeout(() => setShakeFields({ content: false, author: false }), 200);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const response = await fetch('/api/whispers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        setFormData({ content: '', author: '', location: '', color_pref: 'yellow' });
        setTimeout(() => {
          setSubmitSuccess(false);
          setShowForm(false);
        }, 2000);
      } else {
        setSubmitError(data.error || 'Failed to submit message');
      }
    } catch (error) {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getArchiveNumber = (index: number) => {
    return `#B-${String(index + 1).padStart(3, '0')}`;
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Scanning Wave Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.02]">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 49%, rgba(251, 191, 36, 0.3) 50%, transparent 51%)',
            backgroundSize: '100% 4px',
          }}
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setShowForm(true)}
        className="fixed bottom-8 right-8 z-50 px-6 py-3 rounded-full border font-mono text-xs tracking-[0.3em] transition-all duration-300 hover:scale-105"
        style={{
          background: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          borderColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.3)',
          color: isDark ? 'rgba(251, 191, 36, 0.8)' : 'rgba(251, 191, 36, 0.9)',
          backdropFilter: 'blur(12px)',
        }}
        whileHover={{ boxShadow: isDark ? '0 0 30px rgba(251, 191, 36, 0.2)' : '0 0 30px rgba(251, 191, 36, 0.3)' }}
      >
        [ TRANSMIT_SIGNAL ]
      </motion.button>

      {/* Content */}
      <div className="relative z-10">
        {/* The Masthead */}
        <section className="relative pt-32 pb-12 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2 }}
            >
              <h1 className="font-serif text-7xl md:text-8xl lg:text-9xl font-light text-foreground/90 tracking-tight mb-4">
                WHISPERS
              </h1>
              <p className="text-[10px] md:text-xs tracking-[0.4em] text-muted-foreground/50 font-mono uppercase">
                Collecting the Resonance of Besties
              </p>
            </motion.div>
          </div>
        </section>

        {/* Signal Grid - Masonry Layout */}
        <section className="relative py-12 px-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-32">
                <Loader2 className="w-8 h-8 text-muted-foreground/20 animate-spin mx-auto" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-32">
                {/* Empty State - Dynamic Ring */}
                <motion.div
                  className="relative w-32 h-32 mx-auto mb-8"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1 }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="empty-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FBBF24" />
                        <stop offset="100%" stopColor="#38BDF8" />
                      </linearGradient>
                    </defs>
                    {/* Outer Ring */}
                    <motion.circle
                      cx="50" cy="50" r="45"
                      stroke="url(#empty-ring-grad)"
                      strokeWidth="0.5"
                      fill="none"
                      className="opacity-30"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Inner Ring */}
                    <motion.circle
                      cx="50" cy="50" r="35"
                      stroke="url(#empty-ring-grad)"
                      strokeWidth="0.3"
                      fill="none"
                      className="opacity-20"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Core Ring */}
                    <motion.circle
                      cx="50" cy="50" r="25"
                      stroke="url(#empty-ring-grad)"
                      strokeWidth="0.2"
                      fill="none"
                      className="opacity-10"
                      animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </svg>
                </motion.div>
                <motion.p
                  className="text-xs tracking-[0.3em] text-muted-foreground/30 font-mono uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Searching for Echoes...
                </motion.p>
              </div>
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.8 }}
                    className="break-inside-avoid"
                  >
                    <div
                      className="relative p-6 rounded-lg backdrop-blur-md border transition-all duration-500 hover:scale-[1.02]"
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                        borderColor: `rgba(${
                          message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'
                        }, 0.15)`,
                        boxShadow: `0 4px 24px rgba(${
                          message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'
                        }, 0.05)`,
                      }}
                    >
                      {/* Archive Number */}
                      <div className="absolute top-3 left-3">
                        <span className="text-[8px] tracking-[0.2em] font-mono opacity-30">
                          {getArchiveNumber(index)}
                        </span>
                      </div>

                      {/* Color Glow Indicator */}
                      <div
                        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{
                          background: message.color_pref === 'yellow'
                            ? 'rgb(251, 191, 36)'
                            : 'rgb(56, 189, 248)',
                          boxShadow: `0 0 8px ${
                            message.color_pref === 'yellow' ? 'rgba(251, 191, 36, 0.6)' : 'rgba(56, 189, 248, 0.6)'
                          }`,
                        }}
                      />

                      {/* Content */}
                      <div className="relative z-10 pt-4">
                        <p
                          className="font-serif text-base leading-relaxed mb-6"
                          style={{
                            color: message.color_pref === 'yellow'
                              ? isDark ? 'rgba(251, 191, 36, 0.9)' : 'rgba(200, 150, 20, 0.9)'
                              : isDark ? 'rgba(56, 189, 248, 0.9)' : 'rgba(30, 120, 200, 0.9)',
                          }}
                        >
                          "{message.content}"
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-dashed"
                          style={{ borderColor: `rgba(${
                            message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'
                          }, 0.1)` }}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{
                                background: `linear-gradient(135deg, rgba(${
                                  message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'
                                }, 0.15) 0%, rgba(${
                                  message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'
                                }, 0.05) 100%)`,
                                border: `1px solid rgba(${
                                  message.color_pref === 'yellow' ? '251, 191, 36' : '56, 189, 248'
                                }, 0.2)`,
                                color: message.color_pref === 'yellow'
                                  ? 'rgb(251, 191, 36)'
                                  : 'rgb(56, 189, 248)',
                              }}
                            >
                              {message.author.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground/50 font-mono">
                              {message.author}
                            </span>
                          </div>

                          <span className="text-[9px] text-muted-foreground/30 font-mono">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="relative py-12 px-6 border-t border-border/5">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground/20 font-mono uppercase">
              All signals are reviewed before entering the archive
            </p>
          </div>
        </footer>
      </div>

      {/* Full-Screen Glass Sheet Form */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowForm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              style={{ pointerEvents: submitting ? 'none' : 'auto' }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 top-[15vh] z-50 rounded-t-3xl overflow-hidden scrollbar-hide"
              style={{
                background: isDark ? 'rgba(0, 0, 0, 0.92)' : 'rgba(255, 255, 255, 0.97)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1 rounded-full bg-foreground/10" />
              </div>

              {/* Close Button */}
              <motion.button
                onClick={() => !submitting && setShowForm(false)}
                className="absolute top-4 right-4 p-2 rounded-full transition-colors hover:bg-foreground/5"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={submitting}
              >
                <X className="w-5 h-5 text-foreground/40" />
              </motion.button>

              {/* Form Content */}
              <div className="h-full overflow-y-auto px-6 pb-12 scrollbar-hide">
                <div className="max-w-2xl mx-auto pt-8 pb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="font-serif text-3xl text-foreground/90 mb-2">
                      Transmit Your Signal
                    </h2>
                    <p className="text-xs text-muted-foreground/40 font-mono uppercase tracking-wider mb-8">
                      Your whisper will be reviewed before joining the archive
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-10" noValidate>
                      {/* Message - Transparent with animated gradient bottom border */}
                      <div>
                        <label className="block text-[10px] font-mono text-muted-foreground/40 tracking-[0.3em] uppercase mb-4">
                          Your Message
                        </label>
                        <div className="relative group">
                          <motion.div
                            animate={shakeFields.content ? { x: [0, -4, 4, -4, 4, -2, 2, 0] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            <textarea
                              value={formData.content}
                              onChange={(e) => {
                                setFormData({ ...formData, content: e.target.value });
                                if (validationErrors.content && e.target.value.trim()) {
                                  setValidationErrors({ ...validationErrors, content: false });
                                }
                              }}
                              onFocus={() => setIsTextareaFocused(true)}
                              onBlur={() => setIsTextareaFocused(false)}
                              placeholder="Leave a signal in this space..."
                              maxLength={500}
                              rows={5}
                              className="w-full px-0 py-4 bg-transparent text-foreground/80 placeholder:text-muted-foreground/20 focus:outline-none resize-none font-serif text-xl leading-relaxed transition-all duration-300"
                              style={{
                                background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                                backdropFilter: 'blur(4px)',
                                border: 'none',
                                borderBottom: validationErrors.content
                                  ? '1px solid rgba(220, 38, 38, 0.8)'
                                  : '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: validationErrors.content
                                  ? '0 1px 0 0 rgba(220, 38, 38, 0.8)'
                                  : 'none',
                              }}
                            />
                          </motion.div>
                          {/* Animated Gradient Border */}
                          <motion.div
                            className="absolute bottom-0 left-0 h-px"
                            initial={{ scaleX: 0, originX: 0 }}
                            animate={{ scaleX: isTextareaFocused ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                              background: 'linear-gradient(90deg, rgba(251, 191, 36, 0.6) 0%, rgba(56, 189, 248, 0.6) 100%)',
                              width: '100%',
                            }}
                          />
                          {validationErrors.content && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[10px] font-serif text-red-500/60 mt-2 italic"
                            >
                              REQUIRED_SIGNAL_MISSING
                            </motion.p>
                          )}
                          <p className="text-[9px] text-muted-foreground/20 mt-2 text-right font-mono">
                            {formData.content.length}/500
                          </p>
                        </div>
                      </div>

                      {/* Author & Location */}
                      <div className="grid md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-mono text-muted-foreground/40 tracking-[0.3em] uppercase mb-4">
                            Signature
                          </label>
                          <motion.div
                            animate={shakeFields.author ? { x: [0, -4, 4, -4, 4, -2, 2, 0] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            <input
                              type="text"
                              value={formData.author}
                              onChange={(e) => {
                                setFormData({ ...formData, author: e.target.value });
                                if (validationErrors.author && e.target.value.trim()) {
                                  setValidationErrors({ ...validationErrors, author: false });
                                }
                              }}
                              placeholder="Your name"
                              maxLength={100}
                              className="w-full px-0 py-3 bg-transparent text-foreground/80 placeholder:text-muted-foreground/20 focus:outline-none font-mono text-sm border-b transition-all duration-300"
                              style={{
                                borderBottomColor: validationErrors.author
                                  ? 'rgba(220, 38, 38, 0.8)'
                                  : 'rgba(255, 255, 255, 0.1)',
                                boxShadow: validationErrors.author
                                  ? '0 1px 0 0 rgba(220, 38, 38, 0.8)'
                                  : 'none',
                              }}
                            />
                          </motion.div>
                          {validationErrors.author && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[10px] font-serif text-red-500/60 mt-2 italic"
                            >
                              REQUIRED_IDENTITY_MISSING
                            </motion.p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-muted-foreground/40 tracking-[0.3em] uppercase mb-4">
                            Coordinates (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="City or Galaxy"
                            maxLength={200}
                            className="w-full px-0 py-3 bg-transparent text-foreground/80 placeholder:text-muted-foreground/20 focus:outline-none font-mono text-sm border-b border-foreground/10 focus:border-lmsy-blue/50 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Energy Color Selector - With Glow Ring */}
                      <div>
                        <label className="block text-[10px] font-mono text-muted-foreground/40 tracking-[0.3em] uppercase mb-4">
                          Choose Your Energy Color
                        </label>
                        <div className="flex gap-6">
                          {(['yellow', 'blue'] as const).map((color) => (
                            <motion.button
                              key={color}
                              type="button"
                              onClick={() => setFormData({ ...formData, color_pref: color })}
                              className="flex-1 relative px-6 py-5 rounded-xl border transition-all duration-500"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              style={{
                                background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                                borderColor: formData.color_pref === color
                                  ? color === 'yellow'
                                    ? 'rgba(251, 191, 36, 0.3)'
                                    : 'rgba(56, 189, 248, 0.3)'
                                  : 'rgba(255, 255, 255, 0.05)',
                                boxShadow: formData.color_pref === color
                                  ? `0 0 30px ${color === 'yellow' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(56, 189, 248, 0.2)'}`
                                  : 'none',
                              }}
                            >
                              <div className="flex items-center justify-center gap-3">
                                <motion.div
                                  className="w-4 h-4 rounded-full"
                                  animate={formData.color_pref === color ? {
                                    boxShadow: [
                                      `0 0 10px ${color === 'yellow' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                                      `0 0 20px ${color === 'yellow' ? 'rgba(251, 191, 36, 0.6)' : 'rgba(56, 189, 248, 0.6)'}`,
                                      `0 0 10px ${color === 'yellow' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                                    ],
                                  } : {}}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  style={{
                                    background: formData.color_pref === color
                                      ? color === 'yellow'
                                        ? 'rgb(251, 191, 36)'
                                        : 'rgb(56, 189, 248)'
                                      : 'rgba(255, 255, 255, 0.1)',
                                  }}
                                />
                                <span className="text-sm font-mono text-foreground/60">
                                  {color === 'yellow' ? 'Solar' : 'Lunar'}
                                </span>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Success Message */}
                      <AnimatePresence>
                        {submitSuccess && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="py-4 px-6 rounded-lg text-center"
                            style={{
                              background: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                            }}
                          >
                            <p className="text-sm font-mono text-lmsy-blue">
                              ✓ Signal transmitted. Awaiting resonance approval...
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Error Message */}
                      {submitError && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-red-400 font-mono text-center"
                        >
                          {submitError}
                        </motion.p>
                      )}

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: submitting ? 1 : 1.01 }}
                        whileTap={{ scale: submitting ? 1 : 0.99 }}
                        className="w-full py-4 rounded-lg font-mono text-sm tracking-[0.2em] uppercase transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(56, 189, 248, 0.15) 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        }}
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Transmitting...
                          </span>
                        ) : (
                          '[ EMIT_SIGNAL ]'
                        )}
                      </motion.button>
                    </form>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
