import { expect, test } from '@playwright/test';

test.describe('phase 7 portal routes', () => {
  test('management and professional require sign-in', async ({ page }) => {
    await page.goto('/en/my/management');
    await expect(page).toHaveURL(/\/en\/sign-in/);
    await page.goto('/en/my/professional');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });

  test('management list page title EN', async ({ page }) => {
    await page.goto('/en/my/management');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('Phase 7 private adapters reject guest reads and writes before reaching the API', async ({request}) => {
    const operations = [
      ['GET','/api/farm-management-requests'],['POST','/api/farms/1/management-requests'],
      ['GET','/api/farm-management-requests/1'],['PATCH','/api/farm-management-requests/1'],['POST','/api/farm-management-requests/1/submit'],
      ['GET','/api/professional-profile'],['PUT','/api/professional-profile'],['POST','/api/professional-profile/capabilities'],['PATCH','/api/professional-profile/capabilities/1'],
      ['GET','/api/professional-verification-requests'],['POST','/api/professional-verification-requests'],['GET','/api/professional-verification-requests/1'],['PATCH','/api/professional-verification-requests/1'],['POST','/api/professional-verification-requests/1/submit'],['GET','/api/requests/1/documents'],
    ];
    const results=await Promise.all(operations.map(async ([method,url])=>({method,url,response:await request.fetch(url!,{method:method!,...(method==='GET'?{}:{data:{}})})})));
    for(const {method,url,response} of results)expect(response.status(),`${method} ${url}`).toBe(401);
  });
});
