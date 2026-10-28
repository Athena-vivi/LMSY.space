'use client';

import { useEffect, useState } from 'react';
import { Languages, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { resolveImageUrl } from '@/lib/image-url';
import { translateFieldMap, type AdminTranslateTarget } from '@/lib/admin-translate';
import {
  DEFAULT_HERO_SECTION_IMAGE,
  DEFAULT_HERO_CONTENT,
  DEFAULT_PREFACE_CONTENT,
  getHeroSectionImageUrl,
  normalizeHeroContent,
  normalizePrefaceContent,
  toHeroPayload,
  toPrefacePayload,
} from './content-blocks';
import type {
  ContentTab,
  HeroContent,
  HeroFields,
  Lang,
  PrefaceContent,
  PrefaceFields,
} from './types';
import { TabButton } from './components/tab-button';
import { SectionIntro } from './components/section-intro';
import { HeroPanel, PrefacePanel } from './components/settings-panels';
import { TalkSettingsPanel } from './components/talk-settings';
import { VaultImagePicker } from '../gallery/components/vault-image-picker';

type SiteContentBlock = {
  block_key: string;
  content_i18n?: unknown;
  image_url?: string | null;
};

/**
 * Languages the "auto translate from English" button offers.
 *
 * es/pt are not in it: the translation pipeline (lib/ai-translator) only knows
 * en/zh/th, and their homepage copy ships as a bundled first-pass translation
 * instead. Both languages do have their own editable panel, so revising a line
 * by hand works today without touching the pipeline.
 */
const TRANSLATE_TARGETS: AdminTranslateTarget[] = ['zh', 'th'];

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

export default function AdminSettingsPage() {
  const [prefaceContent, setPrefaceContent] = useState<PrefaceContent>(DEFAULT_PREFACE_CONTENT);
  const [heroContent, setHeroContent] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
  const [heroSplashImageUrl, setHeroSplashImageUrl] = useState('');
  const [heroSectionImageUrl, setHeroSectionImageUrl] = useState(DEFAULT_HERO_SECTION_IMAGE);
  // Tag list for the picker's dropdown. The images themselves are never held
  // here: the picker pages through /api/admin/vault/assets on demand.
  const [vaultTags, setVaultTags] = useState<string[]>([]);
  const [isHeroPickerOpen, setIsHeroPickerOpen] = useState(false);
  const [heroPickerTarget, setHeroPickerTarget] = useState<'splash' | 'hero'>('splash');
  const [activeTab, setActiveTab] = useState<ContentTab>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [translatingLang, setTranslatingLang] = useState<AdminTranslateTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlocks() {
      try {
        setLoading(true);
        setError(null);
        const headers = await getAuthHeaders();
        const response = await fetch('/api/admin/site-content', {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load site content');
        }

        // Only the tag list is worth preloading. The picker used to be fed the
        // draft inbox in one go, which meant it died the moment there were no
        // drafts left - and never offered a picture that had already been
        // filed into the archive. It now searches the vault, one page at a
        // time, exactly like the door and cover pickers.
        const vaultResponse = await fetch('/api/admin/vault', {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });
        const vaultResult = await vaultResponse.json();
        if (vaultResponse.ok && vaultResult.success && Array.isArray(vaultResult.data?.tags)) {
          setVaultTags(vaultResult.data.tags.filter((value: unknown): value is string => typeof value === 'string'));
        }

        const blocks: SiteContentBlock[] = Array.isArray(result.blocks) ? result.blocks : [];
        const prefaceBlock = blocks.find((block) => block.block_key === 'homepage_preface');
        const heroBlock = blocks.find((block) => block.block_key === 'homepage_hero');

        if (prefaceBlock?.content_i18n) {
          setPrefaceContent(normalizePrefaceContent(prefaceBlock.content_i18n));
        }
        if (heroBlock?.content_i18n) {
          setHeroContent(normalizeHeroContent(heroBlock.content_i18n));
          setHeroSectionImageUrl(getHeroSectionImageUrl(heroBlock.content_i18n));
        }
        if (typeof heroBlock?.image_url === 'string' && heroBlock.image_url.trim()) {
          setHeroSplashImageUrl(heroBlock.image_url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load site content');
      } finally {
        setLoading(false);
      }
    }

    fetchBlocks();
  }, []);

  const updatePrefaceField = (lang: Lang, field: keyof PrefaceFields, value: string) => {
    setPrefaceContent((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const updateHeroField = (lang: Lang, field: keyof HeroFields, value: string) => {
    setHeroContent((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const handleTranslateCurrentTab = async (targetLang: AdminTranslateTarget) => {
    setTranslatingLang(targetLang);
    setError(null);

    try {
      if (activeTab === 'preface') {
        const translated = await translateFieldMap(prefaceContent.en, targetLang, {
          title: 'title',
          subtitle: 'description',
          prefaceLabel: 'title',
          paragraph1: 'description',
          paragraph2: 'description',
          paragraph3: 'description',
          bestiesMessage: 'description',
          welcome: 'description',
          siteName: 'title',
          siteDesc: 'description',
          curatorTitle: 'title',
          curatorSignature: 'title',
          date: 'description',
        });
        setPrefaceContent((prev) => ({ ...prev, [targetLang]: translated }));
      }

      if (activeTab === 'hero') {
        const translated = await translateFieldMap(heroContent.en, targetLang, {
          preface: 'description',
          universeTitle: 'title',
          universeSubtitle: 'description',
        });
        setHeroContent((prev) => ({ ...prev, [targetLang]: translated }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslatingLang(null);
    }
  };

  // Empty when nothing has been picked yet - the pickers then show "Not set"
  // instead of a bundled placeholder that the front end would never use.
  const splashPreviewSrc = resolveImageUrl(heroSplashImageUrl);
  const heroPreviewSrc = resolveImageUrl(heroSectionImageUrl);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const headers = await getAuthHeaders();
      const saveBlock = async (blockKey: string, payload: unknown) => {
        const requestBody: {
          block_key: string;
          content_i18n: unknown;
          image_url?: string;
          is_active: boolean;
        } = {
          block_key: blockKey,
          content_i18n: payload,
          is_active: true,
        };

        if (blockKey === 'homepage_hero') {
          requestBody.image_url = heroSplashImageUrl.trim();
        }

        const response = await fetch('/api/admin/site-content', {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || `Failed to save ${blockKey}`);
        }
      };

      await saveBlock('homepage_hero', toHeroPayload(heroContent, heroSectionImageUrl));
      await saveBlock('homepage_preface', toPrefacePayload(prefaceContent));

      setSavedAt(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site content');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8">
        <h1 className="mb-2 font-serif text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-ink-2">
          Tabs 1-2 edit homepage content blocks. Tabs 3-5 edit video links and transcripts for talk
          programs and live events.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-400/20 bg-red-500/5 px-4 py-3 text-sm text-red-200/80">
          {error}
        </div>
      )}

      {savedAt && !error && (
        <div className="mb-6 rounded-lg border border-lmsy-yellow/20 bg-lmsy-yellow/5 px-4 py-3 text-sm text-lmsy-yellow/80">
          Saved successfully at {savedAt}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-lmsy-yellow/70" />
        </div>
      ) : (
        <div className="max-w-7xl space-y-8">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === 'hero'} color="yellow" onClick={() => setActiveTab('hero')}>
                Homepage Hero
              </TabButton>
              <TabButton active={activeTab === 'preface'} color="yellow" onClick={() => setActiveTab('preface')}>
                Homepage Preface
              </TabButton>
              <TabButton active={activeTab === 'talk-videos'} color="blue" onClick={() => setActiveTab('talk-videos')}>
                Talk Video Links
              </TabButton>
              <TabButton active={activeTab === 'live-videos'} color="blue" onClick={() => setActiveTab('live-videos')}>
                Live Video Links
              </TabButton>
              <TabButton active={activeTab === 'talk-transcript'} color="blue" onClick={() => setActiveTab('talk-transcript')}>
                Talk Transcript
              </TabButton>
            </div>
          </div>

          {activeTab === 'hero' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-yellow"
                title="Homepage Hero"
                description="Controls the localized copy in the homepage hero section and the loading splash image."
                blockKey="site_content_blocks.homepage_hero"
              />
              <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-mono uppercase tracking-wider text-ink-2">
                      Selected Loading Splash
                    </span>
                    <p className="mt-2 text-xs text-ink-2">
                      Chosen from the Asset Vault. Search or filter by tag, then click an image to
                      use it for the fullscreen LMSY opening animation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div>
                        <span className="block text-xs font-mono uppercase tracking-wider text-ink-2">
                          Loading Splash
                        </span>
                      </div>
                      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-lmsy-yellow/20 bg-black/40">
                        {splashPreviewSrc ? (
                          <Image
                            src={splashPreviewSrc}
                            alt="Selected splash"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2">
                            Not set
                          </div>
                        )}
                      </div>
                      <p className="truncate text-[10px] font-mono uppercase tracking-[0.18em] text-ink-2">
                        {heroSplashImageUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHeroPickerTarget('splash');
                          setIsHeroPickerOpen(true);
                        }}
                        className="rounded-lg border border-lmsy-blue/30 bg-lmsy-blue/10 px-4 py-2 text-xs font-mono tracking-[0.16em] uppercase text-lmsy-blue transition-all hover:bg-lmsy-blue/20"
                      >
                        Choose Splash Image
                      </button>
                    </div>

                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div>
                        <span className="block text-xs font-mono uppercase tracking-wider text-ink-2">
                          Hero Section Image
                        </span>
                      </div>
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-lmsy-blue/20 bg-black/40">
                        {heroPreviewSrc ? (
                          <Image
                            src={heroPreviewSrc}
                            alt="Selected hero section"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono uppercase tracking-[0.2em] text-ink-2">
                            Not set
                          </div>
                        )}
                      </div>
                      <p className="truncate text-[10px] font-mono uppercase tracking-[0.18em] text-ink-2">
                        {heroSectionImageUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHeroPickerTarget('hero');
                          setIsHeroPickerOpen(true);
                        }}
                        className="rounded-lg border border-lmsy-blue/30 bg-lmsy-blue/10 px-4 py-2 text-xs font-mono tracking-[0.16em] uppercase text-lmsy-blue transition-all hover:bg-lmsy-blue/20"
                      >
                        Choose Hero Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRANSLATE_TARGETS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleTranslateCurrentTab(lang)}
                    disabled={translatingLang !== null}
                    className="inline-flex items-center gap-2 rounded border border-lmsy-blue/30 bg-lmsy-blue/10 px-3 py-1.5 text-[10px] font-mono tracking-wider text-lmsy-blue transition-all hover:bg-lmsy-blue/20 disabled:opacity-50"
                  >
                    {translatingLang === lang ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                    AUTO_{lang.toUpperCase()}_FROM_EN
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <HeroPanel lang="en" label="English" content={heroContent.en} onChange={updateHeroField} />
                <HeroPanel lang="zh" label="中文" content={heroContent.zh} onChange={updateHeroField} />
                <HeroPanel lang="th" label="ไทย" content={heroContent.th} onChange={updateHeroField} />
                <HeroPanel lang="es" label="Español" content={heroContent.es} onChange={updateHeroField} />
                <HeroPanel lang="pt" label="Português" content={heroContent.pt} onChange={updateHeroField} />
              </div>
            </>
          )}

          {activeTab === 'preface' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-yellow"
                title="Homepage Preface"
                description="Controls the Museum Preface block on the homepage."
                blockKey="site_content_blocks.homepage_preface"
              />
              <div className="flex flex-wrap gap-2">
                {TRANSLATE_TARGETS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleTranslateCurrentTab(lang)}
                    disabled={translatingLang !== null}
                    className="inline-flex items-center gap-2 rounded border border-lmsy-blue/30 bg-lmsy-blue/10 px-3 py-1.5 text-[10px] font-mono tracking-wider text-lmsy-blue transition-all hover:bg-lmsy-blue/20 disabled:opacity-50"
                  >
                    {translatingLang === lang ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                    AUTO_{lang.toUpperCase()}_FROM_EN
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <PrefacePanel lang="en" label="English" content={prefaceContent.en} onChange={updatePrefaceField} />
                <PrefacePanel lang="zh" label="中文" content={prefaceContent.zh} onChange={updatePrefaceField} />
                <PrefacePanel lang="th" label="ไทย" content={prefaceContent.th} onChange={updatePrefaceField} />
                <PrefacePanel lang="es" label="Español" content={prefaceContent.es} onChange={updatePrefaceField} />
                <PrefacePanel lang="pt" label="Português" content={prefaceContent.pt} onChange={updatePrefaceField} />
              </div>
            </>
          )}

          {activeTab === 'talk-videos' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-blue"
                title="Talk Video Links"
                description="Pick a talk program and set its Bilibili / YouTube video URLs. Saved to"
                blockKey="projects.video_url_bilibili / video_url_youtube"
              />
              <TalkSettingsPanel mode="videos" />
            </>
          )}

          {activeTab === 'live-videos' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-blue"
                title="Live Video Links"
                description="Pick a live event and set its Bilibili / YouTube video URLs. Saved to"
                blockKey="projects.video_url_bilibili / video_url_youtube"
              />
              <TalkSettingsPanel mode="videos" categories={['live_stream']} kind="live" />
            </>
          )}

          {activeTab === 'talk-transcript' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-blue"
                title="Talk Transcript"
                description="Pick a talk program and edit its markdown transcript shown on the detail page. Saved to"
                blockKey="projects.interview_md"
              />
              <TalkSettingsPanel mode="transcript" />
            </>
          )}
        </div>
      )}

      {(activeTab === 'hero' || activeTab === 'preface') && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-lmsy-yellow to-lmsy-blue px-8 py-3 text-black transition-opacity disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Homepage Content
              </>
            )}
          </button>
        </div>
      )}

      <VaultImagePicker
        open={isHeroPickerOpen}
        title={heroPickerTarget === 'splash' ? 'CHOOSE SPLASH IMAGE' : 'CHOOSE HERO IMAGE'}
        subtitle={
          heroPickerTarget === 'splash'
            ? 'Pick one archive image for the homepage opening animation'
            : 'Pick one archive image for the homepage hero section'
        }
        tags={vaultTags}
        currentImageUrl={heroPickerTarget === 'splash' ? heroSplashImageUrl : heroSectionImageUrl}
        onPick={(item) => {
          const picked = item.image_url || '';
          if (heroPickerTarget === 'splash') {
            setHeroSplashImageUrl(picked);
          } else {
            setHeroSectionImageUrl(picked);
          }
          setIsHeroPickerOpen(false);
        }}
        onClose={() => setIsHeroPickerOpen(false)}
      />
    </div>
  );
}
