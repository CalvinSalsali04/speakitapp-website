/* What the page may say about money. A page that disagrees with the App Store
   sheet is a refund, so these mirror the app: 6 free captures
   (FreePlanAllowance.lifetimeCaptureLimit), monthly $2.99 never discounted,
   annual $29.99 with its launch price, and annual below twelve months. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const page=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'..','assets','home.js'),'utf8');
const text=page.replace(/<!--[\s\S]*?-->/g,'');

test('the free allowance is 6, everywhere it is printed',()=>{
  assert.match(text,/6 captures free/);
  assert.doesNotMatch(text,/\b(10|ten)\b[^<]{0,20}captures?/i);
});
test('monthly is $2.99 and never struck through',()=>{
  assert.match(text,/<dt>Monthly<\/dt><dd>\$2\.99/);
  assert.doesNotMatch(text,/<s[^>]*>\$[\d.]+<\/s>[^<]*<\/dd><\/div>\s*<div><dt>Monthly/);
});
test('annual costs less than twelve monthly payments',()=>{
  const annual=Number(text.match(/data-annual>\$(\d+\.\d{2})/)[1]);
  assert.ok(annual<12*2.99);
});
test('the launch price ends when the app ends it',()=>{
  assert.match(script,/SALE_ENDS_AT = Date\.parse\('2026-10-22T04:00:00Z'\)/);
  assert.match(script,/LAUNCH_ANNUAL_PRICE = '\$14\.99'/);
});
