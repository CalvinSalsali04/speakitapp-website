/* What the page may say about money. A page that disagrees with the App Store
   sheet is a refund, so these mirror the app: 6 free captures
   (FreePlanAllowance.lifetimeCaptureLimit), monthly $2.99 never discounted,
   annual $29.99 with its launch price, and annual below twelve months. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const page=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'..','assets','conversion.js'),'utf8');
const text=page.replace(/<!--[\s\S]*?-->/g,'');

/* The <p> inside .price-options whose period text ends with `unit`. */
function plan(unit){
  const match=text.match(new RegExp('<p>(?:(?!</p>).)*?/ '+unit+'</span></p>','s'));
  assert.ok(match,`no ${unit} plan on the page`);
  return match[0];
}
const amount=markup=>Number(markup.match(/\$(\d+\.\d{2})/)[1]);

test('the free allowance is 6, everywhere it is printed',()=>{
  assert.match(text,/first 6 captures/);
  assert.doesNotMatch(text,/\b(10|ten)\b[^<]{0,20}captures?/i);
  assert.doesNotMatch(text,/captures?[^<]{0,20}\b(10|ten)\b/i);
});
test('monthly is $2.99 and never struck through',()=>{
  assert.equal(amount(plan('month')),2.99);
  assert.doesNotMatch(plan('month'),/<s[\s>]|data-annual/);
});
test('annual is $29.99 and costs less than twelve monthly payments',()=>{
  assert.equal(amount(plan('year')),29.99);
  assert.ok(amount(plan('year'))<12*amount(plan('month')));
});
test('the launch price is annual-only and ends when the app ends it',()=>{
  assert.match(script,/var LAUNCH_ANNUAL_PRICE='\$14\.99';/);
  assert.match(script,/var SALE_ENDS_AT=Date\.parse\('2026-10-22T04:00:00Z'\);/);
  assert.match(script,/if\(Date\.now\(\)>=SALE_ENDS_AT\)LAUNCH_ANNUAL_PRICE='';/);
  assert.match(text,/data-launch-note hidden>Annual launch price until October 22\./);
});
