'use client';

import { motion, Variants } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useLanguage } from '@/components/language-provider';
import { useTheme } from '@/components/theme-provider';

export function MuseumPreface() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const { language } = useLanguage();
  const { theme } = useTheme();

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

  // Content based on language
  const content = {
    en: {
      title: 'LMSY.SPACE: The First Orbit',
      subtitle: '首个轨道',
      prefaceLabel: 'Preface / 序言',
      paragraphs: [
        'In the vast and noisy digital universe, some encounters between stars are inevitable.',
        'When Lookmhee and Sonya\'s trajectories converged in that moment in 2024, it created more than just a series, a few songs, or countless beautiful posters. Behind those interwoven light and shadows, a gravity called <span class="text-lmsy-yellow font-semibold">"bond"</span> was quietly triggered. This force transcended borders and languages, ultimately converging into this coordinate called lmsy.space.',
        'Social media is a ceaseless meteor shower—brilliant, rushed, yet all too easily forgotten.',
        'As the curator of this digital archive, I refuse to let those earnest gazes, fragmented moments, or brave confessions be buried by algorithms. I chose to build a lighthouse here. Here, time stands still. Every 4K lossless photo, every late-night translation, every recorded milestone is our weapon against oblivion.',
        'As the curator of this space, I hope you see more than just "content" here—I hope you see a <span class="text-lmsy-blue font-semibold">"perspective"</span>.',
        'Here, yellow is not just a color—it is Lookmhee\'s warm afterglow. Blue is not just a tone—it is Sonya\'s quiet starlight. I carefully weave these fragments, attempting to recreate that sensory experience of shining in the darkness for you.',
      ],
      bestiesMessage: 'To all Besties:',
      welcome: 'Welcome to this sanctuary. No noisy debates, no fragmented information—only the purest records of them.',
      siteName: 'This is lmsy.space.',
      siteDesc: 'It is a vessel for past moments and a witness to eternal future.',
      curatorTitle: 'CURATOR & ARCHIVIST',
      curatorSignature: '— Aster',
      date: '2025.12.31',
    },
    zh: {
      title: 'LMSY.SPACE：首个轨道',
      subtitle: 'The First Orbit',
      prefaceLabel: '序言 / Preface',
      paragraphs: [
        '在浩瀚且喧嚣的数字宇宙中，有些星辰的相遇是某种必然。',
        '当 Lookmhee 与 Sonya 的轨迹在 2024 年的那个瞬间重合，不仅仅是产生了一部剧作、几首单曲或无数张精美的海报。在那些交织的光影背后，一种名为<span class="text-lmsy-yellow font-semibold">"羁绊"</span>的重力被悄然触发。这股引力跨越了国界与语言，最终汇聚成了这个名为 lmsy.space 的坐标。',
        '社交媒体是一场不停歇的流星雨，它绚烂、急促，却也极其容易被遗忘。',
        '作为这座数字档案馆的馆长，我不愿看到那些真挚的凝视、破碎的瞬间或勇敢的表白被算法埋没。我选择在这里建造一座灯塔。在这里，时间是凝固的。每一张 4K 无损的照片、每一段深夜的翻译、每一个被记录的里程碑，都是我们对抗遗忘的武器。',
        '作为这个空间的策展人，我更希望你在这里看到的不仅仅是"物料"，而是一种<span class="text-lmsy-blue font-semibold">"视野"</span>。',
        '在这里，黄色不只是颜色，它是 Lookmhee 温暖的余晖；蓝色不只是色调，它是 Sonya 沉静的星芒。我小心翼翼地编织这些碎片，试图为你重现那种在黑暗中闪闪发光的感官体验。',
      ],
      bestiesMessage: '致所有的 Besties：',
      welcome: '欢迎来到这个避难所。这里没有嘈杂的争论，没有碎片化的信息，只有关于她们最纯粹的记录。',
      siteName: '这里是 lmsy.space。',
      siteDesc: '它是过去时光的容器，也是未来永恒的见证。',
      curatorTitle: 'CURATOR & ARCHIVIST',
      curatorSignature: '—— Aster',
      date: '2025.12.31',
    },
    th: {
      title: 'LMSY.SPACE: วงโคจรแรก',
      subtitle: 'The First Orbit',
      prefaceLabel: 'คำนำ / Preface',
      paragraphs: [
        'ในจักรวาลดิจิทัลที่กว้างใหญ่และอึมตึม บางการพบกันของดวงดารถเป็นสิ่งที่หลีกเลี่ยงไม่ได้',
        'เมื่อวงโคจรของ Lookmhee และ Sonya บรรจบกันในช่วงเวลานั้นของปี 2024 มันไม่ได้สร้างเพียงซีรีส์หนึ่งเรื่อง เพลงสองสามเพลง หรือโปสเตอร์ที่สวยงามนับไม่ถ้วน เบื้องหลังแสงเงาที่ถูกถ่ายทอดนั้น แรงโน้มถ่วงที่เรียกว่า<span class="text-lmsy-yellow font-semibold">"ผูกพัน"</span>ถูกกระตุ้นอย่างเงียบๆ แรงนี้ข้ามพรมแดนและภาษา ในที่สุดบรรจบกันที่พิกัดนี้ lmsy.space',
        'โซเชียลมีเดียเป็นฝนดาวตกที่ไม่หยุดยั้ง สดใส รีบเร่ง แต่ก็ถูกลืมเง่าได้ง่าย',
        'ในฐานะผู้ดูแลหอจดหมายดิจิทัลนี้ ฉันไม่ต้องการให้สายตาที่จริงใจ ช่วงเวลาที่แตกสลาย หรือคำสารภาพที่กล้าหาญถูกฝังด้วยอัลกอริทึม ฉันเลือกที่จะสร้างประภาคารที่นี่ ที่นี่เวลาหยุดนิ่ง ภาพถ่าย 4K ทุกรูป การแปลทุกค่ำคืน และไมล์สโตนที่บันทึกไว้ทุกชิ้นคืออาวุธของเราที่ต่อสู่การถูกลืม',
        'ในฐานะผู้จัดแสดงของพื้นที่นี้ ฉันหวังว่าคุณจะเห็นมากกว่า "เนื้อหา" ฉันหวังว่าคุณจะเห็น<span class="text-lmsy-blue font-semibold">"มุมมอง"</span>',
        'ที่นี่ สีเหลืองไม่ได้เป็นเพียงสี มันคือแสงยามของ Lookmhee สีฟ้าไม่ได้เป็นเพียงโทน มันคือแสงดาวสงบของ Sonya ฉันถักทอดชิ้นส่วนเหล่านี้อย่างประณีต พยายามสร้างสรรค์ประสบการณ์ที่สวยงามในความมืดให้คุณ',
      ],
      bestiesMessage: 'ถึง Besties ทุกคน:',
      welcome: 'ยินดีต้อนรับสู่ที่หลบภัยนี้ ไม่มีการโต้เถียงที่ดัง ไม่มีข้อมูลที่แตกสลาย มีเพียงบันทึกที่บริสุทธิ์ที่สุดของพวกเธอ',
      siteName: 'นี่คือ lmsy.space',
      siteDesc: 'มันเป็นบริสุทธิ์ของช่วงเวลาที่ผ่านมาและพยานถาวีของอนาคต',
      curatorTitle: 'ผู้ดูแล & จัดเก็บ',
      curatorSignature: '— Aster',
      date: '2025.12.31',
    },
  };

  const currentContent = content[language as keyof typeof content] || content.en;

  return (
    <section
      key={theme}
      ref={ref}
      className="relative py-32 md:py-48 overflow-hidden transition-colors duration-500 bg-gradient-to-br from-background via-background dark:to-muted/30 via-yellow-50/30 dark:via-background to-blue-50/20 dark:to-muted/30"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0 transition-transform duration-[20s] ease-in-out animate-gradient-shift dark:opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(251, 191, 36, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(56, 189, 248, 0.15) 0%, transparent 50%)',
            backgroundSize: '200% 200%',
          }}
        />
      </div>

      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 20s ease-in-out infinite;
        }
      `}</style>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          key={language}
          className="max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Title */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-3">
              {currentContent.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground/80 tracking-[0.3em] uppercase font-light">
              {currentContent.subtitle}
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
              {currentContent.prefaceLabel}
            </p>
          </motion.div>

          {/* Main Text - Staggered paragraphs */}
          <motion.div variants={itemVariants} className="space-y-8 mb-16">
            {currentContent.paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify"
                dangerouslySetInnerHTML={{ __html: paragraph }}
              />
            ))}
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={itemVariants}
            className="w-32 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent mx-auto mb-12"
          />

          {/* Besties Message */}
          <motion.div variants={itemVariants} className="space-y-6 mb-12">
            <p className="font-serif text-lg md:text-xl text-lmsy-yellow/80 dark:text-lmsy-yellow/70 leading-relaxed tracking-wide text-justify font-semibold">
              {currentContent.bestiesMessage}
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/90 leading-relaxed tracking-wide text-justify">
              {currentContent.welcome}
            </p>

            <p className="font-serif text-2xl md:text-3xl text-foreground leading-relaxed tracking-wide text-center font-semibold">
              {currentContent.siteName}
            </p>

            <p className="font-serif text-lg md:text-xl text-foreground/80 leading-relaxed tracking-wide text-center italic">
              {currentContent.siteDesc}
            </p>
          </motion.div>

          {/* Curator Signature */}
          <motion.div
            variants={itemVariants}
            className="text-center pt-8 border-t border-foreground/20"
          >
            <p className="font-mono text-xs md:text-sm text-muted-foreground/60 tracking-widest mb-4">
              {currentContent.curatorTitle}
            </p>
            <p className="font-light text-base md:text-lg text-foreground/70 italic tracking-wide mb-4">
              {currentContent.curatorSignature}
            </p>
            <p className="font-mono text-xs text-muted-foreground/50 tracking-wider">
              {currentContent.date}
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
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-lmsy-yellow via-lmsy-blue to-lmsy-yellow blur-md opacity-60 dark:opacity-40" />
              {/* Inner ring */}
              <div className="absolute inset-1 rounded-full bg-background dark:bg-background/80 backdrop-blur-sm" />
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
