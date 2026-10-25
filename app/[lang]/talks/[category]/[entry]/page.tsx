/**
 * /<lang>/talks/<category>/<entry> — language shell for the root conversation
 * route. The page body is re-exported from the root route (one component, one
 * data path); the provider picks the language up from the pathname.
 * Localization of the page body (and its metadata) lands in step 6 of the
 * routing plan.
 */
export const revalidate = 300;

export { default } from '../../../../talks/[category]/[entry]/page';
