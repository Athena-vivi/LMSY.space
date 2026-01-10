'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function BackButton() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 hover:scale-105 group"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        <ArrowLeft className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
        <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors font-serif tracking-wider">
          Back
        </span>
      </motion.button>

      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="relative h-8 w-8">
          <Image
            src="/lmsy-logo.png"
            alt="LMSY Logo"
            fill
            className="object-contain"
            sizes="32px"
            priority
          />
        </div>
      </Link>
    </div>
  );
}
