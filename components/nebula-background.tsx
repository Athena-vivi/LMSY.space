"use client";

import { motion } from "framer-motion";

export function NebulaBackground() {
  return (
    <div className="fixed top-[-10vh] left-[-10vw] w-[120vw] h-[120vh] pointer-events-none -z-10 overflow-hidden">
      {/* Base Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#030303',
          willChange: 'transform',
        }}
      />

      {/* Amber Nebula - Left Side - Extended Range */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.04) 40%, transparent 80%)',
          willChange: 'transform',
        }}
        animate={{
          x: [-20, 20, -20],
          y: [-20, 20, -20],
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Azure Nebula - Right Side - Extended Range */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 80% 70%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.04) 40%, transparent 80%)',
          willChange: 'transform',
        }}
        animate={{
          x: [20, -20, 20],
          y: [-20, 20, -20],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Noise Texture Overlay - Interstellar Grain */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundBlendMode: 'overlay',
          backgroundSize: '200px 200px',
          opacity: 0.03,
          willChange: 'transform',
        }}
      />
    </div>
  );
}
