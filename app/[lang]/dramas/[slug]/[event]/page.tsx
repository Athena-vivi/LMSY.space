/**
 * /<lang>/dramas/<slug>/<event> — language shell for the root entry route.
 * The page body is re-exported from the root route (one component, one data
 * path); the provider picks the language up from the pathname. Localization
 * of the page body The page body gets its language from the provider; metadata is
 * re-exported from the root route and reads the same [lang] param, so each
 * language version carries its own canonical and its own titles.
 */
export const revalidate = 300;

export { default, generateMetadata } from '../../../../(en)/dramas/[slug]/[event]/page';
