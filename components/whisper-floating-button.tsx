"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

export const WhisperPortal = () => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark" || (theme === "system" && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Link
      href="/whispers"
      className="fixed bottom-6 right-6 z-40"
    >
      <motion.div
        className="relative group cursor-pointer flex items-center justify-center w-28 h-28"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" style={!isDark ? { filter: 'saturate(0.8) brightness(0.9)' } : {}}>
          <defs>
            {/* 核心：三重光晕滤镜，制造光线弥散感 */}
            <filter id="portal-bloom" x="-100%" y="-100%" width="300%" height="300%">
              {/* 基础模糊 */}
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              {/* 扩散光效 */}
              <feGaussianBlur stdDeviation="5" result="glowBlur" />
              <feMerge>
                <feMergeNode in="glowBlur" />
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* 地平线渐变：让直线消失，变成朦胧的边缘 */}
            <linearGradient id="horizon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor={isDark ? "white" : "#000"} stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* 1. 弧形地平线 - 增加星球表面的空间感 */}
          <motion.path
            d="M 5 82 Q 50 75 95 82"
            stroke="url(#horizon-grad)"
            strokeWidth="0.8"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2 }}
          />

          {/* 2. 门底座的微弱倒影 - 增加真实感 */}
          <ellipse cx="50" cy="80" rx="35" ry="5" fill={isDark ? "white" : "black"} className="opacity-[0.03]" />

          {/* 3. 核心双生门 - 开启 Screen 模式实现光影叠加 */}
          <g style={{ mixBlendMode: isDark ? 'screen' : 'normal' }} filter="url(#portal-bloom)">

            {/* 左侧：熊之门 (Lookmhee - 稳固) */}
            <motion.path
              d="M 18 80 C 18 30, 58 30, 58 80"
              stroke="#FBBF24"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
              animate={{
                opacity: [0.6, 1, 0.6],
                strokeWidth: [2.5, 2.8, 2.5]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* 右侧：兔之门 (Sonya - 灵动) */}
            <motion.path
              d="M 42 80 C 42 20, 82 20, 82 80"
              stroke="#38BDF8"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
              animate={{
                opacity: [0.6, 1, 0.6],
                strokeWidth: [2.5, 2.8, 2.5]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
          </g>

          {/* 4. 门柱锚点 - 带有微弱发光的星点 */}
          <circle cx="18" cy="80" r="1" fill="#FBBF24" className="animate-pulse" />
          <circle cx="82" cy="80" r="1" fill="#38BDF8" className="animate-pulse" />
        </svg>

        {/* 5. 悬停文案 - 衬线体增加博物馆感 */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700">
          <span className={`text-[8px] tracking-[0.5em] font-serif uppercase whitespace-nowrap ${isDark ? 'text-lmsy-yellow/80' : 'text-black/60'}`}>
            The Whispering Gates
          </span>
        </div>
      </motion.div>
    </Link>
  );
};

// Re-export for backward compatibility
export function WhisperFloatingButton() {
  return <WhisperPortal />;
}
