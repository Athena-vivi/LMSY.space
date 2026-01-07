'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Scissors, Sparkles, Palette, ScissorsIcon, User } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/languages';

export interface CreditData {
  photographer?: string;
  stylist?: string;
  makeup?: string;
  hair?: string;
  wardrobe?: string;
  retouching?: string;
  [key: string]: string | undefined;
}

interface CreditBadgeProps {
  credits: CreditData;
  variant?: 'compact' | 'detailed';
  showIcon?: boolean;
}

const iconMap: Record<string, any> = {
  photographer: Camera,
  stylist: Scissors,
  makeup: Sparkles,
  hair: ScissorsIcon,
  wardrobe: Palette,
  retouching: User,
};

export function CreditBadge({ credits, variant = 'detailed', showIcon = true }: CreditBadgeProps) {
  const { language } = useLanguage();

  if (Object.keys(credits).length === 0) {
    return null;
  }

  if (variant === 'compact') {
    // Compact version for overlay on images
    const primaryCredit = credits.photographer || credits.stylist || Object.values(credits)[0];
    const primaryKey = Object.keys(credits).find(key => credits[key]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10"
      >
        <div className="flex items-center gap-2">
          {showIcon && primaryKey && iconMap[primaryKey] && (
            <div className="w-5 h-5">
              {React.createElement(iconMap[primaryKey], {
                className: 'w-4 h-4 text-lmsy-yellow',
              })}
            </div>
          )}
          <span className="text-xs text-white/70">
            {primaryKey && t(language, `editorial.${primaryKey}` as any) || primaryKey}:
          </span>
          <span className="text-xs text-white font-medium">{primaryCredit}</span>
        </div>
      </motion.div>
    );
  }

  // Detailed version for credits section
  return (
    <div className="space-y-3">
      {Object.entries(credits).map(([key, value], index) => {
        const Icon = iconMap[key] || Sparkles;

        return (
          <motion.div
            key={key}
            className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50 hover:border-lmsy-yellow/30 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {showIcon && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-lmsy-yellow" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t(language, `editorial.${key}` as any) || key}
              </p>
              <p className="text-sm font-medium text-foreground truncate">{value}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface CreditsListProps {
  credits: CreditData;
}

export function CreditsList({ credits }: CreditsListProps) {
  const { language } = useLanguage();

  if (Object.keys(credits).length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(credits).map(([key, value], index) => {
        const Icon = iconMap[key] || Sparkles;

        return (
          <motion.div
            key={key}
            className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-lmsy-yellow/20 to-lmsy-blue/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-lmsy-yellow" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                {t(language, `editorial.${key}` as any) || key}
              </p>
              <p className="font-medium text-foreground truncate">{value}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
