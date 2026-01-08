'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import { ArrowRight, Quote } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

export function LongformSection() {
  const { language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-gradient-radial from-lmsy-yellow/3 via-lmsy-blue/2 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Featured Image */}
          <motion.div
            className="order-2 lg:order-1 relative"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted/30">
              {/* Temporary: Image commented out due to missing file causing 404s */}
              {/* Image with Fade-in */}
              {/* <div className={`absolute inset-0 transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <Image
                  src="/lmsy-interview-001.jpg"
                  alt="Interview Feature"
                  fill
                  className="object-cover"
                  onLoad={() => setImageLoaded(true)}
                />
              </div> */}

              {/* Loading Placeholder - Now used as primary background */}
              {/* {!imageLoaded && ( */}
                <div className="absolute inset-0 bg-gradient-to-br from-lmsy-yellow/20 via-lmsy-blue/20 to-lmsy-yellow/20 animate-pulse" />
              {/* )} */}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {/* Decorative Duo Color Border */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-lmsy-yellow/20 via-lmsy-blue/20 to-lmsy-yellow/20 p-[2px]">
                <div className="absolute inset-0 rounded-2xl bg-background/0" />
              </div>
            </div>

            {/* Floating Quote Icon */}
            <motion.div
              className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-lmsy-yellow to-lmsy-blue flex items-center justify-center shadow-2xl"
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Quote className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            className="order-1 lg:order-2 space-y-8"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Section Labels */}
            <div className="space-y-3">
              <motion.span
                className="inline-block text-xs md:text-sm font-medium tracking-widest uppercase px-4 py-2 rounded-full border border-lmsy-yellow/30 text-lmsy-yellow bg-lmsy-yellow/5"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                {t(language, 'longform.title')}
              </motion.span>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2">
                  <span className="bg-gradient-to-r from-lmsy-yellow to-lmsy-blue bg-clip-text text-transparent">
                    {t(language, 'longform.subtitle')}
                  </span>
                </h2>
              </motion.div>
            </div>

            {/* Excerpt */}
            <motion.div
              className="relative py-8 px-6 md:px-10 rounded-2xl backdrop-blur-xl border"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              {/* Quote Mark */}
              <div className="absolute top-4 left-4 text-6xl font-serif text-lmsy-yellow/20 leading-none">
                "
              </div>

              <blockquote className="relative z-10">
                <p className="font-serif text-lg md:text-xl lg:text-2xl leading-relaxed text-foreground/90 pl-6">
                  {t(language, 'longform.excerpt')}
                </p>
              </blockquote>

              {/* Bottom Quote Mark */}
              <div className="absolute bottom-4 right-4 text-6xl font-serif text-lmsy-blue/20 leading-none">
                "
              </div>
            </motion.div>

            {/* Source */}
            <motion.p
              className="text-sm md:text-base text-muted-foreground italic pl-6 border-l-2 border-lmsy-blue/30"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              {t(language, 'longform.source')}
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="/chronicle"
                className="inline-flex items-center gap-3 group"
              >
                <span className="text-sm font-medium tracking-wider text-foreground/80 group-hover:text-foreground transition-colors">
                  {t(language, 'longform.readMore')}
                </span>
                <motion.div
                  className="w-10 h-10 rounded-full border-2 border-lmsy-yellow/50 flex items-center justify-center group-hover:border-lmsy-yellow transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowRight className="w-4 h-4 text-lmsy-yellow" />
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
