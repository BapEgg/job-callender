import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = process.cwd();
const baselineOnly = process.argv.includes('--baseline-only');
const source = await fs.readFile('references/jobprep_dark_prototype.html');
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== 'f1e964ee2428e8e5da3505b313661639495a746dd9015767200b4e6bb13f3619') throw Error('Approved source changed');
const dir = path.join(root, 'artifacts/visual');
const baselineDir = path.join(root, 'tests/visual/baseline');
await fs.mkdir(dir, { recursive: true });
let sealed = false;
let audit;
try {
  audit = JSON.parse(await fs.readFile(path.join(baselineDir,'manifest.json'), 'utf8'));
} catch (error) { if (error.code !== 'ENOENT' || !baselineOnly) throw error; }
if(audit) {
  for (const entry of audit.referenceFiles) {
    const bytes = await fs.readFile(path.join(baselineDir, entry.file));
    if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256.toLowerCase()) throw Error(`Baseline changed: ${entry.file}`);
  }
  sealed = true;
}
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const selectors = ['.sidebar','.topbar','.page','.stats','.cols-main','.home-right','.table-wrap','.writer','.question-nav','.editor-panel','.writer-aside'];
const results = [];
// Same browser and fonts: exact geometry; only pixel AA differences allowed.
const tolerance = { pixelThreshold: 0.1, maxChangedRatio: 0.001, geometryPx: 0 };
function compare(a,b) {
  if (a.width !== b.width || a.height !== b.height) return { passed:false, dimensionsMatch:false };
  const diff = new PNG({width:a.width,height:a.height});
  const changedPixels = pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:tolerance.pixelThreshold});
  const changedRatio = changedPixels/(a.width*a.height);
  return {passed:changedRatio<=tolerance.maxChangedRatio,dimensionsMatch:true,changedPixels,changedRatio,diff};
}
function crop(png, box) {
  const x=Math.max(0,Math.floor(box.x)), y=Math.max(0,Math.floor(box.y));
  const width=Math.min(png.width-x,Math.ceil(box.width)),height=Math.min(png.height-y,Math.ceil(box.height));
  if(width<=0||height<=0) return null;
  const out=new PNG({width,height}); PNG.bitblt(png,out,x,y,width,height,0,0); return out;
}
async function textExceptions(width,route,kind) {
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,locale:'ko-KR',timezoneId:'Asia/Seoul',reducedMotion:'reduce'});
  try {
    const page=await context.newPage();
    await page.goto(kind==='reference'?`http://127.0.0.1:5173/references/jobprep_dark_prototype.html#${route}`:`http://127.0.0.1:5173/#${route}`);
    await page.locator('#main-content').waitFor(); await page.evaluate(()=>document.fonts.ready);
    const specs=[{selector:'.page-note',text:kind==='reference'?'입력한 변경은 이 브라우저에만 저장됩니다.':'입력 변경은 현재 탭에서만 유지됩니다.'}];
    if(route.startsWith('write')) specs.push(
      {selector:'#save-state',text:kind==='reference'?' 브라우저 저장':' 탭 안에 유지'},
      {selector:'.editor-actionbar + p',text:kind==='reference'?'이 버튼은 미리 작성한 예시 답변을 불러옵니다. 실제 모델 호출·전송·과금은 없습니다.':'실제 AI 실행기는 미연결 상태입니다. 초안을 유지하며 실제 모델 호출·전송·과금은 없습니다.'}
    );
    return await page.evaluate(specs=>specs.map(spec=>{
      const el=document.querySelector(spec.selector); if(!el)throw Error(`Missing exception ${spec.selector}`);
      const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let node; const boxes=[];
      while((node=walker.nextNode())) {const start=node.textContent.indexOf(spec.text);if(start<0)continue;const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+spec.text.length);for(const r of range.getClientRects())boxes.push({x:r.x,y:r.y,width:r.width,height:r.height});}
      if(!boxes.length)throw Error(`Exception text changed: ${spec.selector}`);
      return {...spec,boxes};
    }),specs);
  } finally {await context.close();}
}
function mask(png,exceptions) {
  for(const {boxes} of exceptions)for(const r of boxes)for(let y=Math.max(0,Math.floor(r.y));y<Math.min(png.height,Math.ceil(r.y+r.height));y++)for(let x=Math.max(0,Math.floor(r.x));x<Math.min(png.width,Math.ceil(r.x+r.width));x++){const i=(y*png.width+x)*4;png.data[i]=255;png.data[i+1]=0;png.data[i+2]=255;png.data[i+3]=255;}
}
try {
for (const width of [1440,1280,768,390]) for (const route of ['home','jobs','write/a1']) {
  const key = `${route.replace('/','-')}-${width}`;
  const captures = {};
  for (const kind of baselineOnly ? ['reference'] : ['reference','actual']) {
    const metadataFile = path.join(kind==='reference'?baselineDir:dir, `${key}-${kind}.json`);
    if (kind === 'reference') {
      try { captures.reference = JSON.parse(await fs.readFile(metadataFile, 'utf8')); captures.reference.file=path.join(baselineDir,`${key}-reference.png`); continue; }
      catch (error) { if (error.code !== 'ENOENT' || sealed) throw error; }
      try { await fs.access(path.join(baselineDir, `${key}-reference.png`)); throw Error('Existing baseline image requires approval before regeneration'); }
      catch(error) { if(error.code !== 'ENOENT') throw error; }
    }
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(kind === 'reference' ? `http://127.0.0.1:5173/references/jobprep_dark_prototype.html#${route}` : `http://127.0.0.1:5173/#${route}`);
    await page.locator('#main-content').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const geometry = await page.evaluate(selectors => Object.fromEntries(selectors.map(s => [s, [...document.querySelectorAll(s)].map(el => { const b = el.getBoundingClientRect(); const c = getComputedStyle(el); return {x:b.x,y:b.y,width:b.width,height:b.height,display:c.display,color:c.color,background:c.backgroundColor,columns:c.gridTemplateColumns,font:c.fontFamily}; })])), selectors);
    const captureDir=kind==='reference'?baselineDir:dir;
    const file = path.join(captureDir, `${key}-${kind}.png`);
    await page.screenshot({ path:file, fullPage:true, animations:'disabled' });
    await page.screenshot({ path:path.join(captureDir, `${key}-${kind}-viewport.png`), animations:'disabled' });
    captures[kind] = { file, geometry, errors };
    await fs.writeFile(metadataFile, JSON.stringify(captures[kind], null, 2));
    await context.close();
  }
  const item = { key, ...captures };
  if (!baselineOnly) {
    const a = PNG.sync.read(await fs.readFile(captures.reference.file));
    const b = PNG.sync.read(await fs.readFile(captures.actual.file));
    const referenceExceptions=await textExceptions(width,route,'reference'),actualExceptions=await textExceptions(width,route,'actual');
    item.textExceptions={reference:referenceExceptions,actual:actualExceptions};
    const exceptionUnion=[...referenceExceptions,...actualExceptions];
    mask(a,exceptionUnion);mask(b,exceptionUnion);
    item.dimensionsMatch = a.width === b.width && a.height === b.height;
    if (item.dimensionsMatch) {
      const diff = new PNG({width:a.width,height:a.height});
      item.changedPixels = pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:tolerance.pixelThreshold});
      item.changedRatio = item.changedPixels/(a.width*a.height);
      await fs.writeFile(path.join(dir,`${key}-diff.png`),PNG.sync.write(diff));
    }
    item.geometryMatch = JSON.stringify(captures.reference.geometry) === JSON.stringify(captures.actual.geometry);
    const va=PNG.sync.read(await fs.readFile(path.join(baselineDir,`${key}-reference-viewport.png`))),vb=PNG.sync.read(await fs.readFile(path.join(dir,`${key}-actual-viewport.png`)));
    mask(va,exceptionUnion);mask(vb,exceptionUnion);
    const viewport = compare(va,vb);
    if(viewport.diff) await fs.writeFile(path.join(dir,`${key}-viewport-diff.png`),PNG.sync.write(viewport.diff));
    delete viewport.diff; item.viewport=viewport;
    item.regions=[];
    for(const [selector,boxes] of Object.entries(captures.reference.geometry)) for(const [index,box] of boxes.entries()) {
      if(box.display==='none') continue;
      const other=captures.actual.geometry[selector]?.[index];
      const ca=crop(a,box), cb=other?crop(b,other):null;
      if(!ca) continue;
      const compared=cb?compare(ca,cb):{passed:false}; delete compared.diff;
      item.regions.push({selector,index,...compared});
    }
    item.passed = item.dimensionsMatch && item.changedRatio <= tolerance.maxChangedRatio && item.geometryMatch && viewport.passed && item.regions.every(r=>r.passed) && !captures.actual.errors.length;
  }
  results.push(item);
  console.log(key, baselineOnly ? 'reference captured' : item.passed ? 'PASS' : `FAIL ratio=${item.changedRatio} geometry=${item.geometryMatch}`);
}
} finally { await browser.close(); }
if(!baselineOnly || !sealed) await fs.writeFile(path.join(dir,baselineOnly?'baseline.json':'report.json'),JSON.stringify({hash,tolerance,browser:browser.version(),os:`${os.platform()} ${os.release()}`,deviceScaleFactor:1,locale:'ko-KR',timezoneId:'Asia/Seoul',reducedMotion:'reduce',fixtureDate:'2026-09-16',height:900,results},null,2));
if (!baselineOnly && results.some(r=>!r.passed)) process.exitCode=1;
