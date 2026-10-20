import {test,expect} from '@playwright/test';
test('Add Farm, resume and tracking pages remain private',async({page})=>{
 for(const path of ['/en/my/farms/new','/en/my/farms/1/list?listingId=1&step=6','/ar/my/farms/new','/en/my/requests/1']){await page.goto(path);await expect(page).toHaveURL(/\/(en|ar)\/sign-in\?returnTo=/);}
});
test('listing and specification adapters and request documents reject guests',async({request})=>{
 for(const [method,path] of [['GET','/api/listing-requests/mine'],['GET','/api/listing-requests/1'],['PATCH','/api/listing-requests/1'],['GET','/api/farms/1/specifications'],['PATCH','/api/farms/1/specifications'],['GET','/api/requests/1/documents'],['POST','/api/requests/1/documents'],['POST','/api/listing-requests/1/submit'],['GET','/api/farms/1/media'],['GET','/api/farms/1/media/1/file'],['GET','/api/requests/1/documents/1/download']]){
 const response=await request.fetch(path!,{method:method!,data:method==='PATCH'?{}:undefined});expect(response.status(),`${method} ${path}`).toBe(401);
 }
});
