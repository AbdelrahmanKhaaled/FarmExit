import { IBM_Plex_Sans_Arabic, Manrope } from 'next/font/google';

export const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});

export const fontVariables = `${manrope.variable} ${plexArabic.variable}`;
