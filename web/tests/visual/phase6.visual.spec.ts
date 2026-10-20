import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isolatePhase6 } from './phase6-fixtures';
const output = resolve(__dirname, '../../artifacts/phase6/screenshots');
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390])
    test(`${locale} Add Farm and listing management at ${width}`, async ({ page }, info) => {
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const mockOptions = { submitDelay: 1500, uploadError: false };
      await isolatePhase6(page, locale, mockOptions);
      const capture = async (name: string) => {
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager';
          await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
          window.scrollTo(0, 0);
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} width`).toBe(
          true,
        );
        await expect(page.locator('body')).not.toContainText('workspace.wizard.');
        if (width === 390) {
          for (const title of await page
            .getByTestId('request-documents-panel')
            .getByText(locale === 'ar' ? 'مستند مرجعي' : 'Reference document', { exact: true })
            .all()) {
            if (await title.isVisible())
              expect((await title.boundingBox())!.width, 'document title remains readable').toBeGreaterThan(120);
          }
          for (const title of await page.getByTestId('listing-tracking').getByRole('heading', { level: 2 }).all()) {
            if (await title.isVisible())
              expect((await title.boundingBox())!.width, 'farm title remains readable').toBeGreaterThan(150);
          }
          if (await page.getByTestId('add-farm-wizard').isVisible())
            await expect(
              page.getByRole('button', { name: locale === 'ar' ? 'احفظ واخرج' : 'Save & exit', exact: true }),
            ).toHaveCount(1);
        }
        const path = resolve(output, `${locale}-${width}-${name}.png`);
        await page.screenshot({ path, fullPage: true, animations: 'disabled' });
        await info.attach(name, { path, contentType: 'image/png' });
      };
      for (let step = 1; step <= 7; step++) {
        await page.goto(`/${locale}/phase6/wizard?step=${step}`, { waitUntil: 'networkidle' });
        await capture(`step-${step}`);
        if (width === 390 && step === 7) {
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          const content = await page.getByTestId('request-documents-panel').boundingBox();
          const actions = await page.getByTestId('wizard-actions').boundingBox();
          expect(content && actions && content.y + content.height <= actions.y + 1).toBeTruthy();
        }
      }
      await page
        .getByRole('button', {
          name: locale === 'ar' ? 'قدّم لمراجعة FarmExit' : 'Submit for FarmExit review',
          exact: true,
        })
        .click();
      await capture('submitting');
      await expect(
        page.getByRole('heading', { name: locale === 'ar' ? 'تم تقديم مزرعتك' : 'Your farm was submitted' }),
      ).toBeVisible();
      await capture('success');
      for (const screen of ['new', 'changes', 'readonly', 'farms', 'workspace', 'tracking']) {
        await page.goto(`/${locale}/phase6/${screen}`, { waitUntil: 'networkidle' });
        await capture(screen);
        if (screen === 'readonly') await expect(page.getByTestId('document-file')).toHaveCount(0);
        if (screen === 'new') {
          await page.getByRole('button', { name: locale === 'ar' ? 'متابعة' : 'Continue', exact: true }).click();
          await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toBeVisible();
          await capture('validation-error');
        }
      }
      mockOptions.uploadError = true;
      await page.goto(`/${locale}/phase6/wizard?step=5`, { waitUntil: 'networkidle' });
      const media = page.getByTestId('farm-media-panel');
      await media
        .locator('input[type=file]')
        .setInputFiles(resolve(__dirname, '../../public/images/home/farm-wadi-el-natrun.jpg'));
      await media.locator('button[type=submit]').click();
      await expect(media.getByRole('alert')).toBeVisible();
      await capture('photo-error');
      await media
        .getByRole('button', { name: locale === 'ar' ? 'إلغاء اختيار الملف' : 'Clear selected file', exact: true })
        .click();
      await page.goto(`/${locale}/phase6/wizard?step=6`, { waitUntil: 'networkidle' });
      const docs = page.getByTestId('request-documents-panel');
      await docs.getByTestId('document-file').setInputFiles({
        name: 'visual-only.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.7\nvisual fixture'),
      });
      await docs.locator('button[type=submit]').click();
      await expect(docs.getByRole('alert')).toBeVisible();
      await capture('document-error');
      await docs
        .getByRole('button', { name: locale === 'ar' ? 'إلغاء اختيار الملف' : 'Clear selected file', exact: true })
        .click();
      await page.goto(`/${locale}/phase6/wizard`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: locale === 'ar' ? 'رجوع' : 'Back', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await capture('save-exit');
      expect(errors).toEqual([]);
    });
