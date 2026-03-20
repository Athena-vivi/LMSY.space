'use client';

import { useEffect, useState } from 'react';
import { Languages, Loader2, Save } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { getImageUrl } from '@/lib/image-url';
import { getLocalizedText, type LocalizedText } from '@/lib/localized-content';
import { translateFieldMap, type AdminTranslateTarget } from '@/lib/admin-translate';
import {
  DEFAULT_HERO_SECTION_IMAGE,
  DEFAULT_HERO_CONTENT,
  DEFAULT_LONGFORM_CONTENT,
  DEFAULT_MILESTONES_CONTENT,
  DEFAULT_PREFACE_CONTENT,
  getHeroSectionImageUrl,
  normalizeHeroContent,
  normalizeLongformContent,
  normalizeMilestonesContent,
  normalizePrefaceContent,
  toHeroPayload,
  toLongformPayload,
  toMilestonesPayload,
  toPrefacePayload,
} from './content-blocks';
import type {
  ContentTab,
  HeroContent,
  HeroFields,
  Lang,
  LongformContent,
  LongformFields,
  MilestonesContent,
  MilestonesFields,
  PrefaceContent,
  PrefaceFields,
} from './types';
import { TabButton } from './components/tab-button';
import { SectionIntro } from './components/section-intro';
import { HeroPanel, LongformPanel, MilestonesPanel, PrefacePanel } from './components/settings-panels';

type SiteContentBlock = {
  block_key: string;
  content_i18n?: unknown;
  image_url?: string | null;
};

type GalleryAssetOption = {
  id: string;
  image_url: string | null;
  catalog_id?: string | null;
  title?: string | LocalizedText | null;
};

function getDraftDisplayTitle(title: string | LocalizedText | null | undefined): string {
  if (!title) {
    return '';
  }

  if (typeof title === 'string') {
    return title;
  }

  return getLocalizedText(title, 'en', '') || title.en || title.zh || title.th || '';
}

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
  const [longformContent, setLongformContent] = useState<LongformContent>(DEFAULT_LONGFORM_CONTENT);
  const [milestonesContent, setMilestonesContent] = useState<MilestonesContent>(DEFAULT_MILESTONES_CONTENT);
  const [heroContent, setHeroContent] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
  const [heroSplashImageUrl, setHeroSplashImageUrl] = useState('/hero-reveal.jpg');
  const [heroSectionImageUrl, setHeroSectionImageUrl] = useState(DEFAULT_HERO_SECTION_IMAGE);
  const [heroSplashOptions, setHeroSplashOptions] = useState<GalleryAssetOption[]>([]);
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

        const draftsResponse = await fetch('/api/admin/drafts?limit=200', {
          cache: 'no-store',
          credentials: 'include',
          headers,
        });
        const draftsResult = await draftsResponse.json();
        if (draftsResponse.ok && draftsResult.success && Array.isArray(draftsResult.data)) {
          setHeroSplashOptions(
            draftsResult.data
              .filter((asset: { r2_media_url?: string | null; media_type?: string | null }) => Boolean(asset.r2_media_url) && asset.media_type !== 'video')
              .map((asset: { id: string; r2_media_url?: string | null; catalog_id?: string | null; title?: string | LocalizedText | null }) => ({
                id: asset.id,
                image_url: asset.r2_media_url || null,
                catalog_id: asset.catalog_id || null,
                title: asset.title || null,
              }))
          );
        }

        const blocks: SiteContentBlock[] = Array.isArray(result.blocks) ? result.blocks : [];
        const prefaceBlock = blocks.find((block) => block.block_key === 'homepage_preface');
        const longformBlock = blocks.find((block) => block.block_key === 'homepage_longform');
        const milestonesBlock = blocks.find((block) => block.block_key === 'homepage_milestones');
        const heroBlock = blocks.find((block) => block.block_key === 'homepage_hero');

        if (prefaceBlock?.content_i18n) {
          setPrefaceContent(normalizePrefaceContent(prefaceBlock.content_i18n));
        }
        if (longformBlock?.content_i18n) {
          setLongformContent(normalizeLongformContent(longformBlock.content_i18n));
        }
        if (milestonesBlock?.content_i18n) {
          setMilestonesContent(normalizeMilestonesContent(milestonesBlock.content_i18n));
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

  const updateLongformField = (lang: Lang, field: keyof LongformFields, value: string) => {
    setLongformContent((prev) => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [field]: value,
      },
    }));
  };

  const updateMilestonesField = (lang: Lang, field: keyof MilestonesFields, value: string) => {
    setMilestonesContent((prev) => ({
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

      if (activeTab === 'longform') {
        const translated = await translateFieldMap(longformContent.en, targetLang, {
          eyebrow: 'title',
          fallbackTitle: 'title',
          fallbackExcerpt: 'description',
          source: 'description',
          readMoreLabel: 'title',
        });
        setLongformContent((prev) => ({ ...prev, [targetLang]: translated }));
      }

      if (activeTab === 'milestones') {
        const translated = await translateFieldMap(milestonesContent.en, targetLang, {
          sectionTitle: 'title',
          year2022: 'title',
          year2023: 'title',
          year2024: 'title',
          year2025: 'title',
          ongoing: 'title',
          bottomNote: 'description',
        });
        setMilestonesContent((prev) => ({ ...prev, [targetLang]: translated }));
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
          requestBody.image_url = heroSplashImageUrl.trim() || '/hero-reveal.jpg';
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
      await saveBlock('homepage_longform', toLongformPayload(longformContent));
      await saveBlock('homepage_milestones', toMilestonesPayload(milestonesContent));

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
        <p className="text-muted-foreground">
          Edit homepage-level content blocks. Use tabs to switch between Hero, Preface, Longform, and Milestones.
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
              <TabButton active={activeTab === 'longform'} color="blue" onClick={() => setActiveTab('longform')}>
                Homepage Longform
              </TabButton>
              <TabButton active={activeTab === 'milestones'} color="blue" onClick={() => setActiveTab('milestones')}>
                Homepage Milestones
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
                    <span className="block text-xs font-mono uppercase tracking-wider text-white/35">
                      Selected Loading Splash
                    </span>
                    <p className="mt-2 text-xs text-white/35">
                      Click an image below to use it for the fullscreen LMSY opening animation.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div>
                        <span className="block text-xs font-mono uppercase tracking-wider text-white/35">
                          Loading Splash
                        </span>
                      </div>
                      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-lmsy-yellow/20 bg-black/40">
                        <Image
                          src={getImageUrl(heroSplashImageUrl) || heroSplashImageUrl || '/hero-reveal.jpg'}
                          alt="Selected splash"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <p className="truncate text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
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
                        <span className="block text-xs font-mono uppercase tracking-wider text-white/35">
                          Hero Section Image
                        </span>
                      </div>
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-lmsy-blue/20 bg-black/40">
                        <Image
                          src={getImageUrl(heroSectionImageUrl) || heroSectionImageUrl || DEFAULT_HERO_SECTION_IMAGE}
                          alt="Selected hero section"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <p className="truncate text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
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
              <div className="flex gap-2">
                {(['zh', 'th'] as const).map((lang) => (
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
              <div className="flex gap-2">
                {(['zh', 'th'] as const).map((lang) => (
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
              </div>
            </>
          )}

          {activeTab === 'longform' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-blue"
                title="Homepage Longform"
                description="Controls the outer copy around the Featured Interview block on the homepage."
                blockKey="site_content_blocks.homepage_longform"
              />
              <div className="flex gap-2">
                {(['zh', 'th'] as const).map((lang) => (
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
                <LongformPanel lang="en" label="English" content={longformContent.en} onChange={updateLongformField} />
                <LongformPanel lang="zh" label="中文" content={longformContent.zh} onChange={updateLongformField} />
                <LongformPanel lang="th" label="ไทย" content={longformContent.th} onChange={updateLongformField} />
              </div>
            </>
          )}

          {activeTab === 'milestones' && (
            <>
              <SectionIntro
                iconColor="text-lmsy-blue"
                title="Homepage Milestones"
                description="Controls the localized year labels and note in the homepage milestone section."
                blockKey="site_content_blocks.homepage_milestones"
              />
              <div className="flex gap-2">
                {(['zh', 'th'] as const).map((lang) => (
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
                <MilestonesPanel lang="en" label="English" content={milestonesContent.en} onChange={updateMilestonesField} />
                <MilestonesPanel lang="zh" label="中文" content={milestonesContent.zh} onChange={updateMilestonesField} />
                <MilestonesPanel lang="th" label="ไทย" content={milestonesContent.th} onChange={updateMilestonesField} />
              </div>
            </>
          )}
        </div>
      )}

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

      {isHeroPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h2 className="font-serif text-2xl text-white/90">
                  {heroPickerTarget === 'splash' ? 'Choose Splash Image' : 'Choose Hero Image'}
                </h2>
                <p className="mt-1 text-xs font-mono uppercase tracking-[0.18em] text-white/35">
                  {heroPickerTarget === 'splash'
                    ? 'Select one image for the homepage opening animation'
                    : 'Select one image for the homepage hero section'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHeroPickerOpen(false);
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-mono uppercase tracking-[0.16em] text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(85vh-81px)] overflow-y-auto p-6">
              <div className="mb-4 text-xs font-mono uppercase tracking-[0.16em] text-white/35">
                Draft Inbox · {heroSplashOptions.length} image{heroSplashOptions.length === 1 ? '' : 's'}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {heroSplashOptions.map((asset) => {
                const assetUrl = getImageUrl(asset.image_url) || asset.image_url;
                const isSelected = asset.image_url === heroSplashImageUrl;
                const displayTitle = getDraftDisplayTitle(asset.title);

                if (!assetUrl) {
                  return null;
                }

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      if (heroPickerTarget === 'splash') {
                        setHeroSplashImageUrl(asset.image_url || '/hero-reveal.jpg');
                      } else {
                        setHeroSectionImageUrl(asset.image_url || DEFAULT_HERO_SECTION_IMAGE);
                      }
                      setIsHeroPickerOpen(false);
                    }}
                    className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-lmsy-yellow shadow-[0_0_0_1px_rgba(251,191,36,0.4)]'
                        : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="relative bg-black/40">
                      <Image
                        src={assetUrl}
                        alt={displayTitle || asset.catalog_id || 'Gallery asset'}
                        width={800}
                        height={600}
                        className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
                        unoptimized
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2">
                      <p className="truncate text-[10px] font-mono uppercase tracking-[0.16em] text-white/80">
                        {displayTitle || asset.catalog_id || 'ASSET'}
                      </p>
                    </div>
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
