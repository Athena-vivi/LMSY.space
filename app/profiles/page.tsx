'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

// Sample data - will be replaced with Supabase data
const members = [
  {
    id: 'lookmhee',
    name: 'Lookmhee',
    nickname: 'Lookmhee',
    bio: 'Thai actress known for her captivating role in the Affair series.',
    avatar_url: null,
    ig_handle: 'lookmhee',
    themeColor: 'lmsy-yellow', // Lookmhee's color
  },
  {
    id: 'sonya',
    name: 'Sonya',
    nickname: 'Sonya',
    bio: 'Talented actress who brought the character to life in Affair.',
    avatar_url: null,
    ig_handle: 'sonya',
    themeColor: 'lmsy-blue', // Sonya's color
  },
];

export default function ProfilesPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl mb-6">
              {t(language, 'profiles.title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t(language, 'profiles.description')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Members Grid */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
              >
                <Link href={`/profiles/${member.id}`}>
                  <Card className={`group overflow-hidden border-2 magazine-shadow hover:shadow-xl transition-all duration-300 ${
                    member.themeColor === 'lmsy-yellow'
                      ? 'hover:shadow-lmsy-yellow/20 hover:border-lmsy-yellow'
                      : 'hover:shadow-lmsy-blue/20 hover:border-lmsy-blue'
                  }`}>
                    <CardContent className="p-0">
                      <div className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${
                        member.themeColor === 'lmsy-yellow'
                          ? 'from-lmsy-yellow/20 to-lmsy-yellow/5 dark:from-lmsy-yellow/30 dark:to-lmsy-yellow/10'
                          : 'from-lmsy-blue/20 to-lmsy-blue/5 dark:from-lmsy-blue/30 dark:to-lmsy-blue/10'
                      }`}>
                        {/* Placeholder gradient for member image */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Avatar className="h-32 w-32 md:h-48 md:w-48">
                            <AvatarImage src={member.avatar_url || undefined} alt={member.name} />
                            <AvatarFallback className={`text-3xl md:text-4xl ${
                              member.themeColor === 'lmsy-yellow'
                                ? 'bg-lmsy-yellow/20 text-lmsy-yellow'
                                : 'bg-lmsy-blue/20 text-lmsy-blue'
                            }`}>
                              {member.name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      <div className="p-6 md:p-8">
                        <h3 className={`font-serif text-2xl md:text-3xl mb-2 group-hover:text-${
                          member.themeColor
                        } transition-colors`}>
                          {member.name}
                        </h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {member.bio}
                        </p>
                        <div className={`flex items-center font-medium text-${
                          member.themeColor
                        }`}>
                          {t(language, 'profiles.viewProfile')}
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
