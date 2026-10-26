'use client';

/**
 * /<lang> — reuses the English root's error so the two root layouts cannot
 * drift apart. (Route group (en) does not change URLs.)
 */
export { default } from '../(en)/error';
