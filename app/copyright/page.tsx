'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { Mail, Shield, Scale, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CopyrightPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/5 via-lmsy-blue/3 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Icon */}
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Scale className="w-10 h-10 text-lmsy-yellow" />
            </motion.div>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                {t(language, 'copyright.title')}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground font-light">
              {t(language, 'copyright.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-16">
            {/* Introduction */}
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="font-serif text-xl md:text-2xl text-foreground/80 leading-relaxed">
                {t(language, 'copyright.intro')}
              </p>
            </motion.div>

            {/* Copyright Disclaimer */}
            <motion.div
              className="bg-muted/20 rounded-2xl p-8 md:p-12 border border-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lmsy-yellow/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-lmsy-yellow" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold pt-2">
                  {t(language, 'copyright.disclaimerTitle')}
                </h2>
              </div>
              <p className="text-foreground/70 leading-relaxed pl-16">
                {t(language, 'copyright.disclaimerText')}
              </p>
            </motion.div>

            {/* Fair Use */}
            <motion.div
              className="bg-muted/20 rounded-2xl p-8 md:p-12 border border-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lmsy-blue/20 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-lmsy-blue" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold pt-2">
                  {t(language, 'copyright.fairUseTitle')}
                </h2>
              </div>
              <p className="text-foreground/70 leading-relaxed pl-16">
                {t(language, 'copyright.fairUseText')}
              </p>
            </motion.div>

            {/* Credits */}
            <motion.div
              className="bg-gradient-to-br from-lmsy-yellow/5 to-lmsy-blue/5 rounded-2xl p-8 md:p-12 border border-lmsy-yellow/20"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-lmsy-yellow/30 to-lmsy-blue/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-lmsy-yellow" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold pt-2">
                  {t(language, 'creditTitle')}
                </h2>
              </div>
              <p className="text-foreground/70 leading-relaxed pl-16">
                {t(language, 'creditText')}
              </p>
            </motion.div>

            {/* Contact Section */}
            <motion.div
              className="bg-muted/30 rounded-2xl p-8 md:p-12 border border-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-lmsy-blue/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-lmsy-blue" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold pt-2">
                  {t(language, 'copyright.contactTitle')}
                </h2>
              </div>

              <div className="pl-16 space-y-6">
                <p className="text-foreground/70 leading-relaxed">
                  {t(language, 'copyright.contactText')}
                </p>

                <ul className="space-y-3 text-foreground/70">
                  <li>{t(language, 'copyright.contactItem1')}</li>
                  <li>{t(language, 'copyright.contactItem2')}</li>
                  <li>{t(language, 'copyright.contactItem3')}</li>
                  <li>{t(language, 'copyright.contactItem4')}</li>
                </ul>

                <div className="bg-background rounded-xl p-6 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t(language, 'copyright.contactEmail')}
                  </p>
                  <a
                    href="mailto:copyright@lmsy.space"
                    className="font-serif text-lg text-lmsy-yellow hover:text-lmsy-blue transition-colors"
                  >
                    copyright@lmsy.space
                  </a>
                </div>

                <p className="text-sm text-muted-foreground italic">
                  {t(language, 'copyright.responseTime')}
                </p>
              </div>
            </motion.div>

            {/* Back to Home */}
            <motion.div
              className="text-center pt-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Link
                href="/"
                className="inline-block px-8 py-3 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue text-white font-serif rounded-full hover:shadow-lg hover:shadow-lmsy-blue/20 transition-all duration-300"
              >
                Back to Home
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
