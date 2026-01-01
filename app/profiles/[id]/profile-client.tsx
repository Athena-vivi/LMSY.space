'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Calendar, Ruler, Instagram, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';
import Image from 'next/image';
import { type Member } from '@/lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface ProfileClientProps {
  member: Member;
}

export default function ProfileClient({ member }: ProfileClientProps) {
  const { language } = useLanguage();

  // Calculate age from birthday
  let age = null;
  if (member.birthday) {
    const birthDate = new Date(member.birthday);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Link href="/profiles">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="h-4 w-4" />
            {t(language, 'profiles.back')}
          </Button>
        </Link>
      </div>

      {/* Profile Content - Magazine Style Split Layout */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left - Fixed Image */}
          <motion.div variants={item} className="lg:sticky lg:top-24">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg border-2 border-border magazine-shadow-lg bg-gradient-to-br from-muted/50 to-muted">
              {member.avatar_url ? (
                <Image
                  src={member.avatar_url}
                  alt={member.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="font-serif text-9xl text-muted-foreground/20">
                      {member.name[0]}
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white">
                  {member.nickname}
                </h2>
              </div>
            </div>

            {/* Social Links - Yellow & Blue */}
            <motion.div variants={item} className="mt-6 flex flex-wrap gap-4">
              {member.ig_handle && (
                <a
                  href={`https://instagram.com/${member.ig_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-lmsy-yellow rounded-lg hover:bg-lmsy-yellow hover:text-foreground transition-all duration-300"
                >
                  <Instagram className="w-4 h-4 text-lmsy-yellow" />
                  <span className="text-sm font-medium">Instagram</span>
                </a>
              )}
              {member.x_handle && (
                <a
                  href={`https://x.com/${member.x_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-lmsy-blue rounded-lg hover:bg-lmsy-blue hover:text-foreground transition-all duration-300"
                >
                  <Twitter className="w-4 h-4 text-lmsy-blue" />
                  <span className="text-sm font-medium">Twitter</span>
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* Right - Scrollable Content */}
          <div className="space-y-8">
            {/* Name */}
            <motion.div variants={item}>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 tracking-tight">
                {member.name}
              </h1>
              <Separator className="w-24 h-0.5 bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
            </motion.div>

            {/* Bio */}
            {member.bio && (
              <motion.div variants={item}>
                <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                  {t(language, 'profile.biography')}
                </h3>
                <p className="text-lg leading-relaxed text-muted-foreground">{member.bio}</p>
              </motion.div>
            )}

            {/* Birthday */}
            {member.birthday && (
              <motion.div variants={item}>
                <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                  {t(language, 'profile.born')}
                </h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-lmsy-yellow" />
                  <span className="text-lg">
                    {new Date(member.birthday).toLocaleDateString(
                      language === 'th' ? 'th-TH' : language === 'zh' ? 'zh-CN' : 'en-US',
                      { month: 'long', day: 'numeric', year: 'numeric' }
                    )}
                  </span>
                  {age && (
                    <span className="text-muted-foreground">
                      ({t(language, 'profile.yearsOld', { age })})
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Height */}
            {member.height && (
              <motion.div variants={item}>
                <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                  {t(language, 'profile.height')}
                </h3>
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-lmsy-blue" />
                  <span className="text-lg">{member.height}</span>
                </div>
              </motion.div>
            )}

            {/* Quote */}
            <motion.div
              variants={item}
              className="pt-8 border-t border-border"
            >
              <blockquote className="font-serif text-2xl md:text-3xl leading-relaxed text-foreground/80">
                {t(language, 'profile.quote')}
              </blockquote>
              <cite className="mt-4 block text-sm text-muted-foreground not-italic">
                — {member.nickname}
              </cite>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
