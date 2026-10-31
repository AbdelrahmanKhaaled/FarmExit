import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const localArtifacts = new URL('../artifacts/homepage-fixes/', import.meta.url);
mkdirSync(localArtifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  console.log('1. Capturing English desktop screenshots (1440px)...');
  const pageEn = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await pageEn.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pageEn.waitForTimeout(2000);

  // 1. Hero statistics
  const heroProof = pageEn.locator('div:has(> p:has-text("FarmExit in numbers"))').first();
  await heroProof.scrollIntoViewIfNeeded();
  await pageEn.waitForTimeout(500);
  const heroPath = fileURLToPath(new URL('hero-statistics.png', localArtifacts));
  await heroProof.screenshot({ path: heroPath });
  console.log('Saved hero-statistics.png');

  // 2. About image statistics
  const aboutSection = pageEn.locator('section[aria-labelledby="about-title"]').first();
  await aboutSection.scrollIntoViewIfNeeded();
  await pageEn.waitForTimeout(500);
  const aboutPath = fileURLToPath(new URL('about-image-statistics.png', localArtifacts));
  await aboutSection.screenshot({ path: aboutPath });
  console.log('Saved about-image-statistics.png');

  // 3. Management opportunity cards
  const managementSection = pageEn.locator('section[aria-labelledby="management-title"]').first();
  await managementSection.scrollIntoViewIfNeeded();
  await pageEn.waitForTimeout(500);
  const mgmtPath = fileURLToPath(new URL('management-opportunity-cards.png', localArtifacts));
  await managementSection.screenshot({ path: mgmtPath });
  console.log('Saved management-opportunity-cards.png');

  // 4. Market Insights table
  const insightsSection = pageEn.locator('#market-insights').first();
  await insightsSection.scrollIntoViewIfNeeded();
  await pageEn.waitForTimeout(500);
  const insightsPath = fileURLToPath(new URL('market-insights-table.png', localArtifacts));
  await insightsSection.screenshot({ path: insightsPath });
  console.log('Saved market-insights-table.png');

  await pageEn.close();

  // 5. Arabic Homepage (1440px desktop fullpage)
  console.log('2. Capturing Arabic desktop full page (1440px)...');
  const pageAr = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await pageAr.goto('http://localhost:3000/ar', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pageAr.waitForTimeout(2000);
  const arPath = fileURLToPath(new URL('arabic-homepage.png', localArtifacts));
  await pageAr.screenshot({ path: arPath, fullPage: true });
  console.log('Saved arabic-homepage.png');
  await pageAr.close();

  // 6. Mobile Homepage (390px mobile fullpage)
  console.log('3. Capturing Mobile Homepage full page (390px)...');
  const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pageMobile.goto('http://localhost:3000/en', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pageMobile.waitForTimeout(2000);
  const mobilePath = fileURLToPath(new URL('mobile-homepage.png', localArtifacts));
  await pageMobile.screenshot({ path: mobilePath, fullPage: true });
  console.log('Saved mobile-homepage.png');
  await pageMobile.close();

  console.log('All 6 requested screenshots captured successfully.');
} finally {
  await browser.close();
}
