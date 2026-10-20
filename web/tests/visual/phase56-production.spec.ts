import { test, expect } from '@playwright/test';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isolatePhase6 } from './phase6-fixtures';

// Replace fixture styles with production CSS to catch missing Tailwind sources.
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390]) {
    test(`production CSS ${locale} at ${width}`, async ({ page }) => {
      const chunks = resolve(__dirname, '../../.next/static/chunks');
      const files = (await readdir(chunks)).filter((f) => f.endsWith('.css'));
      expect(files.length).toBeGreaterThan(0);
      const styles = (await Promise.all(files.map((f) => readFile(resolve(chunks, f), 'utf8')))).join('\n');
      const output = resolve(__dirname, '../../artifacts/phase5-6-fixes/production-css');
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      await isolatePhase6(page, locale);
      for (const screen of ['wizard?step=3', 'farms']) {
        await page.goto(`/${locale}/phase6/${screen}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.querySelectorAll('style,link[rel=stylesheet]').forEach((e) => e.remove()));
        await page.addStyleTag({ content: styles });
        await page.evaluate(() => document.fonts.ready);
        const geometry = await page.evaluate(() => {
          const actions = document.querySelector('[data-testid=wizard-actions]');
          const grid =
            actions?.parentElement?.parentElement ?? document.querySelector('[data-testid=my-farmexit] > div');
          return {
            columns: grid ? getComputedStyle(grid).gridTemplateColumns : '',
            children: grid
              ? Array.from(grid.children)
                  .filter((e) => getComputedStyle(e).display !== 'none')
                  .map((e) => ({ x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y }))
              : [],
            position: actions ? getComputedStyle(actions).position : null,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
          };
        });
        expect(geometry.overflow).toBe(false);
        if (width === 1440) {
          expect(geometry.columns).toBe(screen === 'farms' ? '310px 978px' : '296px 656px 264px');
          expect(new Set(geometry.children.map((c) => Math.round(c.y))).size).toBe(1);
          expect(geometry.children[0]!.x < geometry.children[1]!.x).toBe(locale === 'en');
        }
        if (screen !== 'farms') expect(geometry.position).toBe('static');
        await page.screenshot({
          path: resolve(output, `${locale}-${width}-${screen === 'farms' ? 'portal' : 'wizard'}.png`),
          fullPage: true,
        });
      }
    });
  }
