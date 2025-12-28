'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Calendar, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useParams } from 'next/navigation';

// Sample data - will be replaced with Supabase data fetch
const membersData: Record<string, any> = {
  lookmhee: {
    id: 'lookmhee',
    name: 'Lookmhee',
    nickname: 'Lookmhee',
    birthday: '2003-05-15',
    height: '165cm',
    bio: 'Thai actress known for her captivating role in the Affair series. Her portrayal of a complex character won hearts across Southeast Asia.',
    avatar_url: null,
    ig_handle: '@lookmhee',
    x_handle: '@lookmhee_official',
    weibo_handle: '@lookmhee_weibo',
    xhs_handle: '@lookmhee_xhs',
    works: [
      { title: 'Affair', year: '2024', role: 'Lead' },
      { title: 'The Promise', year: '2023', role: 'Supporting' },
    ],
  },
  sonya: {
    id: 'sonya',
    name: 'Sonya',
    nickname: 'Sonya',
    birthday: '2003-08-22',
    height: '168cm',
    bio: 'Talented actress who brought depth and authenticity to her character in Affair. Her on-screen chemistry with Lookmhee created a memorable duo.',
    avatar_url: null,
    ig_handle: '@sonya',
    x_handle: '@sonya_official',
    weibo_handle: '@sonya_weibo',
    xhs_handle: '@sonya_xhs',
    works: [
      { title: 'Affair', year: '2024', role: 'Lead' },
      { title: 'Secret Love', year: '2023', role: 'Guest' },
    ],
  },
};

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

export default function ProfileDetailPage() {
  const params = useParams();
  const member = membersData[params.id as string];

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-3xl mb-4">Member not found</h1>
          <Link href="/profiles">
            <Button>Back to Profiles</Button>
          </Link>
        </div>
      </div>
    );
  }

  const birthDate = new Date(member.birthday);
  const age = new Date().getFullYear() - birthDate.getFullYear();

  return (
    <div className="min-h-screen">
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <Link href="/profiles">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Profiles
          </Button>
        </Link>
      </div>

      {/* Profile Content - Split Layout */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left - Fixed Image */}
          <motion.div variants={item} className="lg:sticky lg:top-24">
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm magazine-shadow-lg bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-950/30">
              {/* Placeholder for member photo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-serif text-9xl text-primary/20">
                    {member.name[0]}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white">
                  {member.nickname}
                </h2>
              </div>
            </div>

            {/* Social Links */}
            <motion.div variants={item} className="mt-6 flex flex-wrap gap-4">
              {member.ig_handle && (
                <a
                  href={`https://instagram.com/${member.ig_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  Instagram
                </a>
              )}
              {member.x_handle && (
                <a
                  href={`https://x.com/${member.x_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Twitter
                </a>
              )}
              {member.weibo_handle && (
                <a
                  href={`https://weibo.com/${member.weibo_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.98 17.55c-3.47.55-6.48-1.22-6.72-3.96-.24-2.75 2.38-5.44 5.85-6 3.47-.55 6.48 1.22 6.72 3.97.24 2.74-2.38 5.43-5.85 5.99zm5.95-9.22c-.66-.21-1.11-.46-1.11-.46s1.59-.66 1.59-2.87c0-2.54-2.96-4.05-6.65-4.05H5.35v14.13h7.34c4.16 0 7.34-2.05 7.34-5.22 0-2.1-1.39-3.39-3.1-4.03v-.5zm-10.1-1.07h3.59c1.38 0 2.5.63 2.5 1.78s-1.12 1.78-2.5 1.78H6.83v-3.56zm4.06 8.66H6.83v-3.72h4.06c1.54 0 2.79.72 2.79 1.86s-1.25 1.86-2.79 1.86zm11.63-7.43c-2.32-.5-2.82-1.45-2.82-2.38 0-1.39 1.14-2.32 3.27-2.32 2.13 0 3.05 1.16 3.14 2.55h2.7c-.11-2.78-2.37-4.87-5.84-4.87-3.29 0-5.95 1.77-5.95 4.56 0 2.43 1.39 3.84 4.56 4.53 2.56.56 3.12 1.57 3.12 2.62 0 1.45-1.3 2.5-3.5 2.5-2.47 0-3.55-1.28-3.69-2.87h-2.73c.14 3.05 2.57 5.06 6.42 5.06 3.47 0 6.25-1.77 6.25-4.71 0-2.61-1.66-4.1-4.93-4.67z"/>
                  </svg>
                  Weibo
                </a>
              )}
              {member.xhs_handle && (
                <a
                  href={`https://xiaohongshu.com/user/profile/${member.xhs_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Xiaohongshu
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* Right - Scrollable Content */}
          <div className="space-y-8">
            {/* Name */}
            <motion.div variants={item}>
              <h1 className="font-serif text-5xl md:text-6xl mb-4">{member.name}</h1>
              <Separator className="w-24 h-0.5 bg-primary" />
            </motion.div>

            {/* Bio */}
            <motion.div variants={item}>
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                BIOGRAPHY
              </h3>
              <p className="text-lg leading-relaxed">{member.bio}</p>
            </motion.div>

            {/* Birthday */}
            <motion.div variants={item}>
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                BORN
              </h3>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{birthDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-muted-foreground">({age} years old)</span>
              </div>
            </motion.div>

            {/* Height */}
            {member.height && (
              <motion.div variants={item}>
                <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-3">
                  HEIGHT
                </h3>
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-primary" />
                  <span>{member.height}</span>
                </div>
              </motion.div>
            )}

            {/* Filmography */}
            <motion.div variants={item}>
              <h3 className="text-sm font-medium tracking-widest text-muted-foreground mb-4">
                WORKS
              </h3>
              <div className="space-y-4">
                {member.works.map((work: any, index: number) => (
                  <div key={index} className="group">
                    <div className="flex items-baseline justify-between">
                      <h4 className="font-serif text-xl group-hover:text-primary transition-colors">
                        {work.title}
                      </h4>
                      <span className="text-sm text-muted-foreground">{work.year}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{work.role}</p>
                    {index < member.works.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quote */}
            <motion.div
              variants={item}
              className="pt-8 border-t border-border"
            >
              <blockquote className="font-serif text-2xl md:text-3xl leading-relaxed text-foreground/80">
                &quot;Grateful for every opportunity to share stories that touch hearts.&quot;
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
