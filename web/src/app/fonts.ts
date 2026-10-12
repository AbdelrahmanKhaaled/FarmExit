import { IBM_Plex_Sans_Arabic, Manrope, Playfair_Display } from 'next/font/google';

// English (Figma Language mode "English": font/family = Manrope).
export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

// Arabic (Figma Language mode "Arabic": font/family = IBM Plex Sans Arabic).
// Weights used by the Figma text styles: Regular, Medium, SemiBold, Bold (ExtraBold maps to Bold).
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});

// Only the Figma text style "Display/Quote Mark" uses Playfair Display (Bold).
export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
});

export const fontVariables = `${manrope.variable} ${plexArabic.variable} ${playfair.variable}`;
