'use client';

import { motion, Variants } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Image, Film, Calendar, Clock } from 'lucide-react';
import type { TimelineEvent } from '@/lib/timeline';
import { getTypeColor } from '@/lib/timeline';

interface ChronicleTimelineProps {
  events: TimelineEvent[];
}

export function ChronicleTimeline({ events }: ChronicleTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const getTypeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'gallery':
        return <Image className="w-3 h-3" />;
      case 'project':
        return <Film className="w-3 h-3" />;
      case 'schedule':
        return <Calendar className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const scrollToElement = (href: string) => {
    // 如果是当前页面的锚点，平滑滚动
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 黄蓝渐变垂直线 */}
      <div className="absolute left-[27px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-lmsy-yellow via-lmsy-blue to-lmsy-yellow opacity-30" />

      {/* 时间轴容器 */}
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            variants={itemVariants}
            className="relative flex items-start gap-6 group"
            onMouseEnter={() => setHoveredId(event.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* 时间点圆点 */}
            <div className="relative z-10 flex-shrink-0">
              <motion.div
                className={`w-14 h-14 rounded-full bg-background border-2 ${
                  hoveredId === event.id
                    ? 'border-lmsy-yellow scale-110'
                    : 'border-border'
                } flex items-center justify-center transition-all duration-300 shadow-lg`}
                animate={hoveredId === event.id ? { scale: 1.1 } : { scale: 1 }}
              >
                {/* 类型图标 */}
                <div className={`${getTypeColor(event.type)} transition-colors duration-300`}>
                  {getTypeIcon(event.type)}
                </div>

                {/* 脉冲动画 */}
                {hoveredId === event.id && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-lmsy-yellow/20"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                )}
              </motion.div>
            </div>

            {/* 卡片内容 */}
            <Link
              href={event.href}
              onClick={() => scrollToElement(event.href)}
              className="flex-1 min-w-0"
            >
              <motion.div
                className={`relative bg-card border border-border rounded-lg p-5 transition-all duration-300 ${
                  hoveredId === event.id
                    ? 'shadow-lg border-lmsy-yellow/50 -translate-y-1'
                    : 'shadow-md hover:shadow-lg'
                }`}
                whileHover={{ y: -2 }}
              >
                {/* 顶部信息栏 */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  {/* 左侧：日期 + 馆藏编号 */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-xs text-muted-foreground tracking-wider">
                        {event.eventDate}
                      </div>
                      <div className="font-mono text-[10px] text-lmsy-blue/80 tracking-widest uppercase">
                        {event.archiveNumber}
                      </div>
                    </div>

                    {/* 分隔线 */}
                    <div className="h-8 w-px bg-border/50" />

                    {/* 类型标签 */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 ${getTypeColor(event.type)} text-xs font-medium uppercase tracking-wider`}>
                      {getTypeIcon(event.type)}
                      <span>{event.type}</span>
                    </div>
                  </div>

                  {/* 右侧：箭头 */}
                  <motion.div
                    className="text-muted-foreground"
                    animate={hoveredId === event.id ? { x: 3 } : { x: 0 }}
                  >
                    →
                  </motion.div>
                </div>

                {/* 标题 */}
                <h3 className={`font-serif text-lg font-semibold mb-2 transition-colors duration-300 ${
                  hoveredId === event.id ? 'text-lmsy-yellow' : 'text-foreground'
                }`}>
                  {event.title}
                </h3>

                {/* 描述（如果有） */}
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                )}

                {/* 悬停时的渐变高光 */}
                {hoveredId === event.id && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-lmsy-yellow/5 via-lmsy-blue/5 to-transparent pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* 底部装饰 */}
      <div className="mt-12 flex items-center justify-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-full">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-mono">
            {events.length} EVENTS ARCHIVED
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
      </div>
    </div>
  );
}
