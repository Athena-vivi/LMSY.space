'use client';

import { motion, Variants } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import { useTheme } from '@/components/theme-provider';

interface MuseumPrefaceLanguageContent {
  title: string;
  subtitle: string;
  prefaceLabel: string;
  paragraphs: string[];
  bestiesMessage: string;
  welcome: string;
  siteName: string;
  siteDesc: string;
  curatorTitle: string;
  curatorSignature: string;
  date: string;
}

type MuseumPrefaceContentMap = Record<'en' | 'zh' | 'th' | 'es' | 'pt', MuseumPrefaceLanguageContent>;

/**
 * The heading carries two things at once - the site name and the orbit it is
 * named after, e.g. "LMSY.SPACE: The First Orbit". They used to share one line
 * with a colon doing the separating; stacked on two lines reads better, and the
 * colon stops being needed. Split on the CJK or the Latin colon and treat what
 * follows as the second line. If the curator never typed a separator the title
 * stays exactly as written, on one line.
 */
function splitPrefaceTitle(title: string): [string, string] {
  const match = title.match(/[:：]/);
  if (!match || match.index === undefined) return [title, ''];

  const head = title.slice(0, match.index).trim();
  const tail = title.slice(match.index + match[0].length).trim();
  if (!head || !tail) return [title, ''];

  return [head, tail];
}

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
  const fallbackContent: MuseumPrefaceContentMap = {
    en: {
      title: 'LMSY.SPACE: The First Orbit',
      subtitle: 'A Living Archive',
      prefaceLabel: 'Preface',
      paragraphs: [
        'Some encounters remain in trending feeds, timelines, and conversations that disappear almost as quickly as they arrive. Others deserve to be kept with greater care.',
        'LMSY.SPACE began from that feeling. What is gathered here is not only images and fragments, but also a record of companionship, attention, and resonance.',
        'May you meet them again here, and perhaps meet once more the moments that first moved your heart.',
      ],
      bestiesMessage: 'To all Besties,',
      welcome: 'Welcome to an archive built with affection, patience, and remembrance.',
      siteName: 'This is lmsy.space.',
      siteDesc: '',
      curatorTitle: 'CURATOR & ARCHIVIST',
      curatorSignature: 'Astra',
      date: 'Since 2025',
    },
    zh: {
      title: 'LMSY.SPACE：第一轨道',
      subtitle: '一座仍在生长的档案馆',
      prefaceLabel: '序言',
      paragraphs: [
        '有些相遇会停留在热搜、时间线和转瞬即逝的讨论里，也有些相遇，值得被更认真地保存。',
        'LMSY.SPACE 诞生于这样的念头。这里收集的不只是图像与片段，也是一种关于陪伴、注视与共鸣的轨迹。',
        '愿你在这里重新遇见她们，也重新遇见那些曾让你心动的瞬间。',
      ],
      bestiesMessage: '致所有 Besties，',
      welcome: '欢迎来到这座以爱、耐心与记忆慢慢建立起来的 archive。',
      siteName: '这里是 lmsy.space。',
      siteDesc: '',
      curatorTitle: '策展与档案整理',
      curatorSignature: 'Astra',
      date: '始于 2025',
    },
    th: {
      title: 'LMSY.SPACE: วงโคจรแรก',
      subtitle: 'คลังบันทึกที่ยังเติบโตอยู่',
      prefaceLabel: 'คำนำ',
      paragraphs: [
        'บางการพบกันอาจคงอยู่เพียงในกระแส ความเคลื่อนไหว และบทสนทนาที่เลือนหายไปอย่างรวดเร็ว แต่อีกบางการพบกันก็ควรถูกเก็บรักษาไว้ด้วยความตั้งใจมากกว่านั้น',
        'LMSY.SPACE เริ่มต้นจากความรู้สึกเช่นนั้น สิ่งที่ถูกรวบรวมไว้ที่นี่ไม่ใช่เพียงภาพหรือเศษเสี้ยวของช่วงเวลา แต่ยังเป็นร่องรอยของการเฝ้ามอง การอยู่เคียงข้าง และความสั่นสะเทือนในใจ',
        'ขอให้คุณได้พบพวกเธออีกครั้งที่นี่ และได้พบอีกครั้งกับช่วงเวลาที่เคยทำให้หัวใจของคุณสั่นไหว',
      ],
      bestiesMessage: 'ถึง Besties ทุกคน,',
      welcome: 'ยินดีต้อนรับสู่ archive ที่ค่อย ๆ ถูกสร้างขึ้นด้วยความรัก ความอดทน และความทรงจำ',
      siteName: 'ที่นี่คือ lmsy.space',
      siteDesc: '',
      curatorTitle: 'CURATOR & ARCHIVIST',
      curatorSignature: 'Astra',
      date: 'ตั้งแต่ปี 2025',
    },
    es: {
      title: 'LMSY.SPACE: La primera órbita',
      subtitle: 'Un archivo vivo',
      prefaceLabel: 'Prefacio',
      paragraphs: [
        'Algunos encuentros se quedan en las tendencias, en las líneas de tiempo y en conversaciones que desaparecen casi tan rápido como llegan. Otros merecen guardarse con más cuidado.',
        'LMSY.SPACE nació de esa sensación. Lo que se reúne aquí no son solo imágenes y fragmentos, sino también el registro de una compañía, de una mirada atenta y de una resonancia.',
        'Ojalá vuelvas a encontrarlas aquí, y vuelvas a encontrar también esos momentos que un día te movieron el corazón.',
      ],
      bestiesMessage: 'Para todas las Besties,',
      welcome: 'Bienvenida a un archivo construido con cariño, paciencia y memoria.',
      siteName: 'Esto es lmsy.space.',
      siteDesc: '',
      curatorTitle: 'CURADORA Y ARCHIVISTA',
      curatorSignature: 'Astra',
      date: 'Desde 2025',
    },
    pt: {
      title: 'LMSY.SPACE: A primeira órbita',
      subtitle: 'Um arquivo vivo',
      prefaceLabel: 'Prefácio',
      paragraphs: [
        'Alguns encontros ficam nas trends, nas linhas do tempo e em conversas que desaparecem quase tão rápido quanto chegam. Outros merecem ser guardados com mais cuidado.',
        'O LMSY.SPACE nasceu desse sentimento. O que se reúne aqui não são apenas imagens e fragmentos, mas também o registro de uma companhia, de um olhar atento e de uma ressonância.',
        'Que você reencontre elas aqui, e reencontre também aqueles momentos que um dia mexeram com o seu coração.',
      ],
      bestiesMessage: 'Para todas as Besties,',
      welcome: 'Boas-vindas a um arquivo construído com afeto, paciência e memória.',
      siteName: 'Este é o lmsy.space.',
      siteDesc: '',
      curatorTitle: 'CURADORA E ARQUIVISTA',
      curatorSignature: 'Astra',
      date: 'Desde 2025',
    },
  };

  const [content, setContent] = useState<MuseumPrefaceContentMap>(fallbackContent);

  useEffect(() => {
    async function fetchContentBlock() {
      try {
        const response = await fetch('/api/site-content?key=homepage_preface', {
          cache: 'no-store',
        });

        if (!response.ok) return;

        const payload = await response.json();
        if (!payload.success || !payload.block?.content_i18n) return;

        const remote = payload.block.content_i18n as Partial<MuseumPrefaceContentMap>;
        setContent({
          en: { ...fallbackContent.en, ...(remote.en || {}) },
          zh: { ...fallbackContent.zh, ...(remote.zh || {}) },
          th: { ...fallbackContent.th, ...(remote.th || {}) },
          es: { ...fallbackContent.es, ...(remote.es || {}) },
          pt: { ...fallbackContent.pt, ...(remote.pt || {}) },
        });
      } catch (error) {
        console.error('[SITE_CONTENT] Failed to fetch homepage_preface:', error);
      }
    }

    fetchContentBlock();
  }, []);

  const currentContent = content[language as keyof typeof content] || content.en;
  const [titleLine, orbitLine] = splitPrefaceTitle(currentContent.title);

  return (
    <section
      key={theme}
      ref={ref}
      className="relative py-32 md:py-48 overflow-hidden transition-colors duration-500"
    >

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          key={language}
          className="max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {/* Title - site name, then the orbit on its own line, then the tagline */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-ink mb-3">
              {titleLine}
            </h2>
            {orbitLine && (
              <p className="font-serif text-xl md:text-2xl text-ink-2 tracking-[0.2em] mb-3">
                {orbitLine}
              </p>
            )}
            <p className="text-sm md:text-base text-ink-2 tracking-[0.3em] uppercase font-light">
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
            <p className="font-serif text-lg md:text-xl text-ink-2 tracking-wider leading-relaxed mb-2">
              {currentContent.prefaceLabel}
            </p>
          </motion.div>

          {/* Main Text - Staggered paragraphs */}
          <motion.div variants={itemVariants} className="space-y-8 mb-16">
            {currentContent.paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="font-serif text-lg md:text-xl text-ink leading-relaxed tracking-wide text-justify"
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

            <p className="font-serif text-lg md:text-xl text-ink leading-relaxed tracking-wide text-justify">
              {currentContent.welcome}
            </p>

            <p className="font-serif text-2xl md:text-3xl text-ink leading-relaxed tracking-wide text-center font-semibold">
              {currentContent.siteName}
            </p>

            {currentContent.siteDesc && (
              <p className="font-serif text-lg md:text-xl text-ink leading-relaxed tracking-wide text-center italic">
                {currentContent.siteDesc}
              </p>
            )}
          </motion.div>

          {/* Curator Signature */}
          <motion.div
            variants={itemVariants}
            className="text-center pt-8 border-t border-foreground/20"
          >
            <p className="font-mono text-xs md:text-sm text-ink-2 tracking-widest mb-4">
              {currentContent.curatorTitle}
            </p>
            <p className="font-light text-base md:text-lg text-ink-2 italic tracking-wide mb-4">
              {currentContent.curatorSignature}
            </p>
            <p className="font-mono text-xs text-ink-2 tracking-wider">
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
              <div
                className="absolute inset-1 rounded-full backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
              />
              {/* Center dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-r from-lmsy-yellow to-lmsy-blue" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
