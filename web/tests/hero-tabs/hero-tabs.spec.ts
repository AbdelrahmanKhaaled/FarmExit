import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import en from '../../messages/en/home.json';
import ar from '../../messages/ar/home.json';
import enWorkspace from '../../messages/en/workspace.json';
import arWorkspace from '../../messages/ar/workspace.json';

const fixture = 'http://127.0.0.1:4107';
const consoleErrors = new WeakMap<Page, string[]>();
const modes = ['quickBuy', 'buy', 'quickSale', 'standardSale', 'rent', 'partnership', 'management'] as const;
const labels = (locale: string) => (locale === 'ar' ? ar : en).hero.search;
const wizardLabels = (locale: string) => (locale === 'ar' ? arWorkspace : enWorkspace).wizard;
async function switchLocale(page: Page, locale: string) {
  if (!(await page.locator(`a[hreflang=${locale}]:visible`).count())) {
    await page.locator('header button[aria-haspopup=dialog]').click();
  }
  await page.locator(`a[hreflang=${locale}]:visible`).click();
}
async function step(page: Page, number: number) {
  await expect(page.getByTestId('add-farm-wizard')).toBeVisible();
  const menu = page.locator('[data-testid="add-farm-wizard"] details summary').first();
  if (await menu.isVisible()) await menu.click();
  await page
    .locator('[data-testid="add-farm-wizard"] nav:visible button')
    .nth(number - 1)
    .click();
  if (await menu.isVisible()) await menu.click();
}
test.beforeEach(async ({ request, page }) => {
  await request.post(fixture + '/fixture/reset');
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on('console', (message) => {
    // Existing footer links point to pages that are not implemented in this repository.
    const existingFooter404 =
      /\/(en|ar)\/(about|careers|contact|terms)\?_rsc=/.test(message.location().url) && message.text().includes('404');
    if (
      message.type() === 'error' &&
      !existingFooter404 &&
      !(message.location().url.includes('/sale-terms') && message.text().includes('404'))
    )
      errors.push(message.location().url + ': ' + message.text());
  });
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHZkAAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  page.on('pageerror', (error) => {
    throw error;
  });
});
test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page)).toEqual([]);
});

test('seven tabs: destinations, values, locale state and responsive screenshots', async ({ page }, info) => {
  const locale = info.project.metadata.locale as string;
  const t = labels(locale);
  await page.goto('/' + locale);
  const hero = page.getByTestId('hero-search');
  await expect(hero.locator('[aria-pressed]')).toHaveText(modes.map((mode) => t.modes[mode]));
  for (const mode of modes) {
    await page.goto('/' + locale + '?heroTab=' + mode);
    await expect(hero.getByRole('button', { name: t.modes[mode], exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (mode === 'quickBuy') {
      await hero.locator('[name=availableCash]').fill('250000');
      await hero.locator('[name=installmentAmount]').fill('750000');
      await hero.locator('summary').click();
      await expect(hero.locator('input[type=checkbox]')).toHaveCount(6);
      await hero.getByLabel(t.assets.factory, { exact: true }).check();
      await hero.getByLabel(t.assets.other, { exact: true }).check();
      await hero.locator('[name=assetValue_factory]').fill('300000');
      await hero.locator('[name=assetValue_other]').fill('50000');
      await hero.locator('[name=otherDescription]').fill('معدات / Equipment');
      mkdirSync('artifacts/hero-tabs', { recursive: true });
      await hero.screenshot({ path: `artifacts/hero-tabs/${info.project.name}-quick-buy.png` });
    }
    if (mode === 'buy') {
      await hero.locator('[name=location]').selectOption('giza');
      await hero.locator('[name=activity]').selectOption('fruit');
    }
    if (mode === 'partnership') {
      await hero.locator('[name=governorate]').selectOption('Giza');
      await hero.locator('[name=farmType]').selectOption('fruit');
      await hero.locator('[name=minArea]').fill('25');
      await hero.locator('[name=objective]').selectOption('expandCultivation');
    }
    if (mode === 'management') {
      await hero.locator('[name=location]').selectOption('Giza');
      await hero.locator('[name=activity]').selectOption('fruit');
      await hero.locator('[name=managementType]').selectOption({ index: 1 });
    }
    await hero.locator('button[type=submit]').click();
    if (['quickSale', 'standardSale', 'rent'].includes(mode)) {
      await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
      expect(new URL(page.url()).searchParams.get('returnTo')).toContain('/my/farms/new?entryMode=' + mode);
    } else if (mode === 'partnership') {
      await expect(page).toHaveURL(/\/partnerships\?/);
      for (const [name, value] of Object.entries({
        governorate: 'Giza',
        farmType: 'fruit',
        minArea: '25',
        objective: 'expandCultivation',
      }))
        await expect(page.locator(`.om-hero-search [name=${name}]`)).toHaveValue(value);
      await page.locator('.om-toolbar select').selectOption('areaAsc');
      await expect(page).toHaveURL(url => url.searchParams.get('sort') === 'areaAsc');
      await page.reload();
      expect(new URL(page.url()).searchParams.get('objective')).toBe('expandCultivation');
      await expect(page.locator('.om-hero-search [name=objective]')).toHaveValue('expandCultivation');
      await page.goBack();
      await expect(page).toHaveURL(url => url.pathname.endsWith('/partnerships') && !url.searchParams.has('sort'));
      await expect(page.locator('.om-hero-search [name=governorate]')).toHaveValue('Giza');
      await expect(page.locator('.om-hero-search [name=objective]')).toHaveValue('expandCultivation');
    } else if (mode === 'management') {
      await expect(page).toHaveURL(/\/management/);
      expect(new URL(page.url()).searchParams.get('governorate')).toBe('Giza');
      expect(new URL(page.url()).searchParams.get('farmType')).toBe('fruit');
      expect(new URL(page.url()).searchParams.get('managementType')).toBeTruthy();
    } else {
      await expect(page).toHaveURL(/\/farms\?/);
      const query = new URL(page.url()).searchParams;
      if (mode === 'quickBuy') {
        expect(query.get('availableCash')).toBe('250000');
        expect(query.get('exchangeItems')).toBe('factory,other');
        expect(query.get('saleMethods')).toBe('installment,exchange');
        expect(query.get('exchangeAssetTypes')).toBe('factory');
        await expect(page.getByRole('complementary', { name: t.modes.quickBuy })).toContainText('250000');
        await page
          .getByTestId('marketplace')
          .getByLabel(locale === 'ar' ? 'رتّب حسب' : 'Sort by')
          .selectOption('priceAsc');
        await page.reload();
        expect(new URL(page.url()).searchParams.get('otherDescription')).toBe('معدات / Equipment');
      } else {
        expect(query.get('location')).toBe('giza');
        expect(query.get('activity')).toBe('fruit');
      }
    }
    if (mode === 'quickBuy' || mode === 'partnership') {
      const query = new URL(page.url()).search;
      const other = locale === 'en' ? 'ar' : 'en';
      await switchLocale(page, other);
      await expect(page).toHaveURL((url) => url.pathname.startsWith('/' + other + '/') && url.search === query);
      await page.reload();
      expect(new URL(page.url()).search).toBe(query);
    }
    await page.goto('/' + locale + '?heroTab=' + mode);
    await page.reload();
    const otherLocale = locale === 'en' ? 'ar' : 'en';
    await switchLocale(page, otherLocale);
    await expect(page).toHaveURL(new RegExp('/' + otherLocale + '\\?heroTab=' + mode));
    await expect(hero.getByRole('button', { name: labels(otherLocale).modes[mode], exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }
  await page.goto('/' + locale + '?heroTab=partnership');
  await hero.screenshot({ path: `artifacts/hero-tabs/${info.project.name}-partnership.png` });
  await page
    .locator('section[aria-labelledby=hero-title]')
    .screenshot({ path: `artifacts/hero-tabs/${info.project.name}-hero.png` });
});

test('locked listing modes survive saves, every step, refresh, locale switch and draft resumption', async ({
  page,
  context,
  request,
}, info) => {
  const locale = info.project.metadata.locale as string;
  const token = 'fixture.' + Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url') + '.fixture';
  await context.addCookies([{ name: 'fx_web_at', value: token, domain: 'localhost', path: '/' }]);
  for (const mode of ['quickSale', 'standardSale', 'rent']) {
    await request.post(fixture + '/fixture/reset');
    await page.goto(`/${locale}/my/farms/new?entryMode=${mode}`);
    await page.getByRole('link', { name: 'Hero Test Farm', exact: true }).click();
    await expect(page.getByTestId('add-farm-wizard')).toBeVisible();
    await step(page, 4);
    const radios = page.locator('input[name=listingType]');
    await expect(radios).toHaveCount(2);
    await expect(radios.nth(mode === 'rent' ? 1 : 0)).toBeChecked();
    for (const radio of await radios.all()) await expect(radio).toBeDisabled();
    if (mode === 'quickSale') {
      await expect(page.locator('input[name=saleMode][value=standardCash]')).toBeChecked();
      await expect(page.locator('input[name=saleMode][value=quickSale]')).toBeDisabled();
    }
    if (mode === 'standardSale') {
      await page.locator('input[name=quickSaleChoice][value=both]').check();
      await page.locator('input[name=acceptedExchangeAsset][value=factory]').check();
      await page.locator('input[name=acceptedExchangeAsset][value=farm]').check();
    }
    // Existing wizard saves through the BFF into this in-memory fixture only.
    await page
      .getByTestId('wizard-actions')
      .getByRole('button', { name: wizardLabels(locale).continue, exact: true })
      .click();
    // On mobile the Save control is available instead of desktop Save and exit.
    await expect
      .poll(async () => (await (await request.get(fixture + '/fixture/state')).json()).listing?.listingType)
      .toBe(mode === 'rent' ? 'rent' : 'sale');
    if (mode !== 'rent')
      await expect
        .poll(async () => (await (await request.get(fixture + '/fixture/state')).json()).terms?.saleMode)
        .toBe(mode === 'quickSale' ? 'standardCash' : 'quickSale');
    const state = await (await request.get(fixture + '/fixture/state')).json();
    if (mode === 'quickSale')
      expect(state.terms).toMatchObject({
        saleMode: 'standardCash',
        acceptsCashProposals: true,
        acceptsInstallmentProposals: false,
        acceptsExchangeProposals: false,
      });
    if (mode === 'standardSale')
      expect(state.terms).toMatchObject({
        saleMode: 'quickSale',
        acceptsCashProposals: false,
        acceptsInstallmentProposals: true,
        acceptsExchangeProposals: true,
        exchangeAssetTypes: ['factory'],
      });
    await page.goto(`/${locale}/my/farms/hero-farm/list?listingId=hero-listing&step=4`);
    await expect(radios.nth(mode === 'rent' ? 1 : 0)).toBeChecked();
    await expect(radios.first()).toBeDisabled();
    if (mode === 'standardSale') {
      await expect(page.locator('input[name=acceptedExchangeAsset][value=farm]')).toBeChecked();
    }
    expect(await page.evaluate(() => localStorage.getItem('fx:listing-entry:v1:hero-user:hero-listing'))).toBe(mode);
    for (let number = 1; number <= 7; number++) {
      await step(page, number);
      expect(new URL(page.url()).searchParams.get('entryMode')).toBe(mode);
      await page.reload();
      await expect(page.getByTestId('add-farm-wizard')).toBeVisible();
    }
    await step(page, 4);
    await page.locator('[data-testid=add-farm-wizard] header a[hreflang]:visible').click();
    await expect(radios.first()).toBeDisabled();
    await expect(radios.nth(mode === 'rent' ? 1 : 0)).toBeChecked();
    expect(new URL(page.url()).searchParams.get('entryMode')).toBe(mode);
    await page.goto(
      `/${locale}/my/farms/hero-farm/list?listingId=hero-listing&entryMode=${mode === 'rent' ? 'quickSale' : 'rent'}`,
    );
    await expect(page.locator('p[role=alert]')).toContainText(labels(locale).conflict);
    await expect(page.getByTestId('add-farm-wizard')).toHaveCount(0);
    await page.goto('/' + locale);
    await page.evaluate(() => localStorage.clear());
  }
});

test('new farms preserve mode before a listing exists; incompatible saved terms cannot be overwritten', async ({
  page,
  context,
  request,
}, info) => {
  const locale = info.project.metadata.locale as string;
  const token = 'fixture.' + Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url') + '.fixture';
  await context.addCookies([{ name: 'fx_web_at', value: token, domain: 'localhost', path: '/' }]);
  for (const mode of ['quickSale', 'standardSale', 'rent']) {
    await request.post(fixture + '/fixture/reset');
    await page.goto(`/${locale}/my/farms/new?entryMode=${mode}&createFarm=1`);
    await page.getByTestId('add-farm-wizard').locator('textarea:visible').first().fill('New Hero Farm');
    await page.locator('input[name=farmType][value=fruit]').check();
    await page.locator('input[name=areaFeddan]').fill('20');
    await page
      .getByTestId('wizard-actions')
      .getByRole('button', { name: wizardLabels(locale).continue, exact: true })
      .click();
    await page.locator('select[name=governorate]').selectOption('Giza');
    await page
      .getByTestId('wizard-actions')
      .getByRole('button', { name: wizardLabels(locale).continue, exact: true })
      .click();
    await expect(page).toHaveURL(/\/my\/farms\/hero-farm\/list\?/);
    expect(await page.evaluate(() => localStorage.getItem('fx:listing-entry:v1:hero-user:farm:hero-farm'))).toBe(mode);
    await page.goto(`/${locale}/my/farms/hero-farm/list?step=4`);
    await expect(page.locator('input[name=listingType]').nth(mode === 'rent' ? 1 : 0)).toBeChecked();
    await expect(page.locator('input[name=listingType]').first()).toBeDisabled();
    await page.evaluate(() => localStorage.clear());
  }
  await request.post(fixture + '/fixture/reset');
  await request.post(fixture + '/fixture/draft', {
    data: {
      terms: {
        saleMode: 'quickSale',
        acceptsCashProposals: false,
        acceptsInstallmentProposals: true,
        acceptsExchangeProposals: false,
        exchangePreferenceScope: 'any',
        exchangeAssetTypes: [],
        configured: true,
      },
    },
  });
  await page.goto(`/${locale}/my/farms/new?entryMode=quickSale`);
  await page.getByRole('link', { name: 'Hero Test Farm', exact: true }).click();
  await expect(page).toHaveURL(/listingId=hero-listing/);
  await step(page, 4);
  await expect(page.getByText(labels(locale).termsConflict, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fx:listing-entry:v1:hero-user:hero-listing'))).toBeNull();
  await page
    .getByTestId('wizard-actions')
    .getByRole('button', { name: wizardLabels(locale).continue, exact: true })
    .click();
  expect((await (await request.get(fixture + '/fixture/state')).json()).writes).toHaveLength(0);
});
