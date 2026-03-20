'use client';

import { useEffect, useState } from 'react';
import { Languages, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { translateFieldMap, type AdminTranslateTarget } from '@/lib/admin-translate';
import {
  DEFAULT_HERO_CONTENT,
  DEFAULT_LONGFORM_CONTENT,
  DEFAULT_MILESTONES_CONTENT,
  DEFAULT_PREFACE_CONTENT,
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

        const blocks = Array.isArray(result.blocks) ? result.blocks : [];
        const prefaceBlock = blocks.find((block: any) => block.block_key === 'homepage_preface');
        const longformBlock = blocks.find((block: any) => block.block_key === 'homepage_longform');
        const milestonesBlock = blocks.find((block: any) => block.block_key === 'homepage_milestones');
        const heroBlock = blocks.find((block: any) => block.block_key === 'homepage_hero');

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
        const response = await fetch('/api/admin/site-content', {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            block_key: blockKey,
            content_i18n: payload,
            is_active: true,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || `Failed to save ${blockKey}`);
        }
      };

      await saveBlock('homepage_hero', toHeroPayload(heroContent));
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
                description="Controls the localized copy in the homepage hero section."
                blockKey="site_content_blocks.homepage_hero"
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
    </div>
  );
}
