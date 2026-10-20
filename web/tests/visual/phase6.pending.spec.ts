import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
import {isolatePhase6} from './phase6-fixtures';
test('selected private files survive step navigation and must be uploaded or cleared before saving',async({page})=>{
 const requests=await isolatePhase6(page);await page.goto('/en/phase6/wizard?step=5');const panel=page.getByTestId('farm-media-panel');
 await panel.locator('input[type=file]').setInputFiles(resolve(__dirname,'../../public/images/home/farm-wadi-el-natrun.jpg'));
 await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toContainText('Upload or clear');expect(requests).toHaveLength(0);
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(panel.locator('input[type=file]')).not.toHaveValue('');
 await panel.getByRole('button',{name:'Clear selected file',exact:true}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByTestId('request-documents-panel')).toBeVisible();
});
test('a successful HTTP response without a confirmed review status cannot claim submission success',async({page})=>{
 await isolatePhase6(page);await page.route('**/api/listing-requests/*/submit',route=>route.fulfill({json:{id:'2001',status:'draft'}}));await page.goto('/en/phase6/wizard?step=7');await page.getByRole('button',{name:'Submit for FarmExit review',exact:true}).click();await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toBeVisible();await expect(page.getByRole('heading',{name:'Your farm was submitted'})).toHaveCount(0);
});
