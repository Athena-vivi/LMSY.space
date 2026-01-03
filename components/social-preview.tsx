'use client';

import { useState } from 'react';
import { Copy, Check, Twitter, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface SocialPreviewProps {
  archiveNumber: string;
  title: string;
  description: string;
  tags: string[];
  imageUrl?: string;
  project?: string;
}

export function SocialPreview({
  archiveNumber,
  title,
  description,
  tags,
  imageUrl,
  project,
}: SocialPreviewProps) {
  const [copied, setCopied] = useState<string | null>(null);

  // 生成 X (Twitter) 文案
  const generateTwitterText = () => {
    const hashtags = tags.map(tag => `#${tag.replace(/\s+/g, '')}`).join(' ');
    return `📸 ${archiveNumber}

${title}

${description}

${project ? `🎬 Project: ${project}` : ''}

${hashtags}

#LMSY #Lookmhee #Sonya #Besties`;
  };

  // 生成微博文案
  const generateWeiboText = () => {
    const hashtags = tags.map(tag => `#${tag}#`).join(' ');
    return `【${archiveNumber}】

${title}

${description}

${project ? `关联作品：${project}` : ''}

${hashtags}

#Lookmhee# #Sonya# #LMSY##Besties#
📸 lmsy.space`;
  };

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  };

  const twitterText = generateTwitterText();
  const weiboText = generateWeiboText();

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-foreground flex items-center gap-2">
        <Copy className="h-4 w-4" />
        Social Media Preview
      </h3>

      {/* X (Twitter) Preview */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <Twitter className="h-4 w-4" />
            <span className="font-medium text-sm">X (Twitter)</span>
          </div>
          <motion.button
            onClick={() => copyToClipboard(twitterText, 'twitter')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-background hover:bg-lmsy-yellow/20 border border-border rounded-md transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {copied === 'twitter' ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </motion.button>
        </div>
        <div className="p-4 bg-card">
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {twitterText}
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Character count:</span>
              <span className={twitterText.length > 280 ? 'text-red-500' : 'text-green-500'}>
                {twitterText.length} / 280
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weibo Preview */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="font-medium text-sm">微博</span>
          </div>
          <motion.button
            onClick={() => copyToClipboard(weiboText, 'weibo')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-background hover:bg-lmsy-blue/20 border border-border rounded-md transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {copied === 'weibo' ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                复制成功
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                复制
              </>
            )}
          </motion.button>
        </div>
        <div className="p-4 bg-card">
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {weiboText}
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>字数:</span>
              <span>{weiboText.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Text Area */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <span className="font-medium text-sm">Custom Curator's Note</span>
        </div>
        <div className="p-4 bg-card">
          <textarea
            placeholder="Write your own curation note..."
            className="w-full min-h-[120px] p-3 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:border-lmsy-yellow resize-none"
            onChange={(e) => {
              // 可以在这里保存自定义文案到 state
            }}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Add your personal touch</span>
            <span>{0} / 500</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="p-3 bg-lmsy-yellow/10 border border-lmsy-yellow/30 rounded-lg">
        <p className="text-xs text-foreground">
          💡 <strong>Tip:</strong> Use the pre-generated templates above or write your own curator's note.
          Click "Copy" to quickly share to social platforms.
        </p>
      </div>
    </div>
  );
}
