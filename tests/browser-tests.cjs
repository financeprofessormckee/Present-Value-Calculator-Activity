'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = process.env.PV_TEST_ROOT || path.resolve(__dirname,'..');
let checks=0;
function ok(condition,message) { assert.ok(condition,message); checks++; }
(async () => {
  const browser=await chromium.launch({headless:true, executablePath:process.env.PV_TEST_CHROMIUM || undefined, args:JSON.parse(process.env.PV_TEST_ARGS || '[]')});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:1000}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'index.html')).href);
    ok(await page.locator('#net').textContent()==='$486.85','Initial net');
    for (const id of ['earlier','rate','zero','cancel']) {
      await page.locator('[data-prompt="'+id+'"]').click();
      await page.locator('#check-prompt').click();
      ok((await page.locator('#prompt-feedback').textContent()).startsWith('Not yet.'),'Incomplete '+id);
      const [field,value] = {earlier:['#year-p1','4'],rate:['#rate-number','10.1'],zero:['#rate-number','0'],cancel:['#year-p2','2']}[id];
      await page.locator(field).fill(value);
      await page.locator('#check-prompt').click();
      ok((await page.locator('#prompt-feedback').textContent()).startsWith('Done.'),'Completed '+id);
      await page.locator('#amount-p1').fill('');
      ok(!(await page.locator('#prompt-feedback').textContent()).startsWith('Done.'),'Invalid edit clears completion '+id);
      ok(await page.locator('#draft-notice').isVisible(),'Last-valid-values warning');
      await page.locator('#check-prompt').click();
      ok(await page.locator('#amount-p1').evaluate(e=>document.activeElement===e),'Check focuses invalid input');
    }
    await page.locator('#reset').click();
    await page.locator('#amount-p1').fill('10000.01');
    await page.locator('#rate-number').fill('12');
    await page.locator('#add').click();
    ok(await page.locator('#amount-p1').inputValue()==='10000.01','Unrelated edit and table rebuild preserve invalid draft');
    ok(await page.locator('#amount-p1').getAttribute('aria-invalid')==='true','Preserve invalid marker');
    await page.locator('#remove').click();
    ok(await page.locator('#payments-body button[aria-pressed="true"]').evaluate(e=>document.activeElement===e),'Removal focuses survivor');
    await page.locator('#reset').click();
    ok(!await page.locator('#draft-notice').isVisible(),'Reset clears draft notice');
    await page.locator('[data-prompt="earlier"]').click();
    await page.locator('#amount-p1').fill('0.01');
    ok(Number(await page.locator('#graph .nominal').getAttribute('height'))>80,'Cent-scale payment is visible');
    await page.locator('#amount-p1').fill('0');
    ok(await page.locator('#graph .stack').count()===0,'Zero does not create a fake stack contribution');
    ok(await page.locator('#graph .zero-marker').count()===1,'Visible zero marker');
    await page.locator('#amount-p1').fill('-0.01');
    await page.locator('#year-p1').fill('30');
    await page.locator('#rate-number').fill('25');
    ok(await page.locator('#net').textContent()==='$0.00','No negative zero in rounded money');
    await page.locator('[data-prompt="earlier"]').click();
    ok(!await page.locator('#remove').isEnabled(),'One-payment minimum');
    for(let i=1;i<12;i++) await page.locator('#add').click();
    ok(!await page.locator('#add').isEnabled(),'Twelve-payment maximum');
    for (const year of [0,30]) {
      for (const input of await page.locator('input[data-kind="year"]').all()) await input.fill(String(year));
      const boxes=await page.locator('#graph .hit-area').evaluateAll(nodes=>nodes.map(e=>({x:+e.getAttribute('x'),w:+e.getAttribute('width')})).sort((a,b)=>a.x-b.x));
      ok(boxes.every((b,i)=>!i || b.x>=boxes[i-1].x+boxes[i-1].w),'Distinct hit targets at year '+year);
      ok(boxes[0].x>=270 && boxes.at(-1).x+boxes.at(-1).w<=955,'No clipping at year '+year);
    }
    await page.locator('[data-prompt="earlier"]').click();
    await page.locator('#graph').scrollIntoViewIfNeeded();
    let box=await page.locator('#graph .nominal').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+20); await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+100,box.y+20,{steps:5});
    ok(Number(await page.locator('#year-p1').inputValue())>5,'Dragging changes date');
    await page.keyboard.press('Escape'); await page.mouse.up();
    ok(await page.locator('#year-p1').inputValue()==='5','Escape cancels drag');
    box=await page.locator('#graph .nominal').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+20); await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+70,box.y+20,{steps:4});
    await page.locator('#graph').dispatchEvent('pointercancel',{pointerId:1}); await page.mouse.up();
    ok(await page.locator('#year-p1').inputValue()==='5','Pointer cancellation restores date');
    await page.locator('#year-p1').fill('0');
    await page.locator('#later').click();
    await page.locator('#earlier').click();
    ok(await page.locator('#later').evaluate(e=>document.activeElement===e),'Boundary button moves focus to enabled alternative');
    await page.locator('#reset').click();
    for(const width of [1280,640,375,320]) {
      await page.setViewportSize({width,height:900});
      ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow at '+width);
      ok((await page.locator('#graph').boundingBox()).width>=760,'Readable graph at '+width);
    }
    await page.setViewportSize({width:1280,height:1000});
    await page.locator('#payments-body button[aria-pressed="true"]').hover();
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const a11y=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
    ok(a11y.violations.length===0,'Automated accessibility: '+a11y.violations.map(v=>v.id).join(', '));
    await page.emulateMedia({media:'print'});
    ok(await page.locator('.print-only').first().isVisible(),'Printed rows retain payment identity');
    ok(errors.length===0,'No browser errors: '+errors.join(', '));
    console.log(checks+' browser checks, 0 failures (Chromium '+browser.version()+'); axe '+a11y.testEngine.version+', 0 violations.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
