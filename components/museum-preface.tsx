'use client';

import { motion, Variants } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export function MuseumPreface() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
      },
    },
  };

  return (
    <section
      ref={ref}
      className="relative py-32 md:py-48 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFFBEB 0%, #F0F9FF 50%, #FFFBEB 100%)',
        backgroundSize: '400% 400%',
        animation: 'meshGradient 20s ease infinite',
      }}
    >
      {/* Mesh gradient animation */}
      <style jsx>{`
        @keyframes meshGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3">
              LMSY.SPACE：首个轨道
            </h2>
            <p className="text-sm md:text-base text-muted-foreground/80 tracking-[0.3em] uppercase font-light">
              The First Orbit
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="w-32 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent mx-auto mb-16"
          />

          {/* Preface Content */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <p className="font-serif text-lg md:text-xl text-muted-foreground/70 tracking-wider leading-relaxed mb-2">
              序言 / Preface
            </p>
          </motion.div>

          {/* Main Text - Staggered paragraphs */}
          <motion.div variants={itemVariants} className="space-y-8 mb-16">
            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              在浩瀚且喧嚣的数字宇宙中，有些星辰的相遇是某种必然。
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              当 Lookmhee 与 Sonya 的轨迹在 2022 年的那个瞬间重合，不仅仅是产生了一部剧作、几首单曲或无数张精美的海报。在那些交织的光影背后，一种名为<span className="text-lmsy-yellow font-semibold">"羁绊"</span>的重力被悄然触发。这股引力跨越了国界与语言，最终汇聚成了这个名为 lmsy.space 的坐标。
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              社交媒体是一场不停歇的流星雨，它绚烂、急促，却也极其容易被遗忘。
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              作为这座数字档案馆的馆长，我不愿看到那些真挚的凝视、破碎的瞬间或勇敢的表白被算法埋没。我选择在这里建造一座灯塔。在这里，时间是凝固的。每一张 4K 无损的照片、每一段深夜的翻译、每一个被记录的里程碑，都是我们对抗遗忘的武器。
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              作为这个空间的策展人，我更希望你在这里看到的不仅仅是"物料"，而是一种<span className="text-lmsy-blue font-semibold">"视野"</span>。
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              在这里，黄色不只是颜色，它是 Lookmhee 温暖的余晖；蓝色不只是色调，它是 Sonya 沉静的星芒。我小心翼翼地编织这些碎片，试图为你重现那种在黑暗中闪闪发光的感官体验。
            </p>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="w-32 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent mx-auto mb-12"
          />

          {/* Besties Message */}
          <motion.div variants={itemVariants} className="space-y-6 mb-12">
            <p className="font-serif text-lg md:text-xl text-lmsy-yellow/80 leading-relaxed tracking-wide text-justify font-semibold">
              致所有的 Besties：
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              欢迎来到这个避难所。这里没有嘈杂的争论，没有碎片化的信息，只有关于她们最纯粹的记录。
            </p>

            <p className="font-serif text-2xl md:text-3xl text-foreground leading-relaxed tracking-wide text-center font-semibold">
              这里是 lmsy.space。
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/80 leading-relaxed tracking-wide text-center italic">
              它是过去时光的容器，也是未来永恒的见证。
            </p>
          </motion.div>

          {/* Curator Signature */}
          <motion.div
            variants={itemVariants}
            className="text-center pt-8 border-t border-foreground/20"
          >
            <p className="font-mono text-xs md:text-sm text-muted-foreground/60 tracking-widest mb-4">
              CURATOR & ARCHIVIST
            </p>
            <p className="font-serif text-lg md:text-xl text-foreground/90 tracking-wide mb-2">
              Aster
            </p>
            <p className="font-light text-sm md:text-base text-foreground/60 italic tracking-wide mb-4">
              —— Aster
            </p>
            <p className="font-mono text-xs text-muted-foreground/50 tracking-wider">
              2025.12.31
            </p>
          </motion.div>

          {/* Bear-Rabbit Ring Logo */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center mt-12"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <div className="relative w-16 h-16">
              {/* Glowing ring effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow blur-md opacity-60" />
              {/* Inner ring */}
              <div className="absolute inset-1 rounded-full bg-background" />
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
