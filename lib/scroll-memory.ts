import { stripLangPrefix } from '@/lib/i18n-path';

/**
 * Keeps a language switch from throwing the reader back to the top.
 *
 * /editorial and /pt/editorial sit under two different root layouts
 * (app/(en)/ and app/[lang]/), so choosing a language is a FULL document
 * load, not a client transition: React remounts, the browser treats the new
 * document as a fresh page and paints it at scroll 0. Someone who was reading
 * the eleventh item of the editorial wall lands back on the hero.
 *
 * Reading a new document at the same offset needs two halves:
 *
 * 1. rememberScrollPosition() runs on click, before navigating. The offset is
 *    keyed by the path with the language prefix stripped, because the path is
 *    the only thing the two documents share - /zh/editorial must restore at
 *    the offset remembered on /editorial.
 * 2. SCROLL_RESTORE_SCRIPT runs from each root layout's inline script, before
 *    the splash overlay and the rest of the body are parsed, and scrolls back
 *    once the document is parsed.
 *
 * It is deliberately a one-shot: the entry is deleted as soon as it is used,
 * and it expires after twenty seconds, so a stale offset can never hijack a
 * later visit to the same page.
 */

export const SCROLL_STORAGE_KEY = 'lmsy-scroll-restore';

/** Attempts at re-applying the offset while lazy images settle the height. */
const RESTORE_ATTEMPTS = 12;
const RESTORE_INTERVAL_MS = 50;
const MAX_AGE_MS = 20000;

type StoredScroll = {
  /** Language-agnostic path, e.g. '/editorial'. */
  p: string;
  /** Offset in CSS pixels. */
  y: number;
  /** When it was taken; used to ignore stale entries. */
  t: number;
};

/**
 * Records the current offset for the page the visitor is about to leave.
 * Called from the language switcher's click handler only - ordinary
 * navigation keeps the browser's own behaviour.
 */
export function rememberScrollPosition(pathname: string): void {
  try {
    const entry: StoredScroll = {
      p: stripLangPrefix(pathname),
      y: Math.round(window.scrollY),
      t: Date.now(),
    };
    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* storage blocked (private mode): the page simply opens at the top */
  }
}

/**
 * Runs synchronously at the top of <body>.
 *
 * Kept as a string because it has to execute before hydration - a React
 * effect would be too late, the browser has already painted the top. The
 * regex for the language prefix mirrors ROUTE_LANGUAGES in lib/i18n-path.ts;
 * it is duplicated rather than imported because this code cannot use module
 * syntax.
 */
export const SCROLL_RESTORE_SCRIPT = `(function(){try{
var KEY='${SCROLL_STORAGE_KEY}';
var raw=sessionStorage.getItem(KEY);
if(!raw)return;
var m=JSON.parse(raw);
if(!m||typeof m.y!=='number'||typeof m.p!=='string')return;
if(Date.now()-m.t>${MAX_AGE_MS}){sessionStorage.removeItem(KEY);return;}
var path=location.pathname.replace(/^\\/(zh|th|es|pt)(?=\\/|$)/,'')||'/';
if(path!==m.p)return;
sessionStorage.removeItem(KEY);
if('scrollRestoration' in history)history.scrollRestoration='manual';
var y=m.y;
var root=document.documentElement;
var prev=root.style.scrollBehavior;
root.style.scrollBehavior='auto';
var tries=0;
var cancelled=false;
var cancel=function(){cancelled=true;root.style.scrollBehavior=prev;};
['wheel','touchstart','keydown','mousedown'].forEach(function(ev){
  window.addEventListener(ev,cancel,{passive:true,once:true});
});
var apply=function(){
  if(cancelled)return;
  window.scrollTo(0,y);
  tries++;
  var now=window.pageYOffset||root.scrollTop||0;
  if(tries<${RESTORE_ATTEMPTS}&&Math.abs(now-y)>4){
    setTimeout(apply,${RESTORE_INTERVAL_MS});
    return;
  }
  root.style.scrollBehavior=prev;
};
document.addEventListener('DOMContentLoaded',apply);
window.addEventListener('load',apply);
}catch(e){}})();`;
