/* What the page may say about money. A page that disagrees with the App Store
   sheet is a refund, so these mirror the app: 6 free captures
   (FreePlanAllowance.lifetimeCaptureLimit), monthly $2.99 never discounted,
   annual $14.99 without an expired discount, and annual below twelve months. */
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
test('annual is $14.99 and costs less than twelve monthly payments',()=>{
  assert.equal(amount(plan('year')),14.99);
  assert.ok(amount(plan('year'))<12*amount(plan('month')));
});
test('neither plan advertises a discount and scripts cannot restore the expired price',()=>{
  assert.doesNotMatch(plan('year'),/<s[\s>]/);
  assert.doesNotMatch(text,/data-launch-note|half price|until Oct 22|\$29\.99/);
  assert.doesNotMatch(script,/LAUNCH_ANNUAL_PRICE|SALE_ENDS_AT|\$29\.99/);
  assert.doesNotMatch(script,/nowPrice\.textContent\s*=/);
});
