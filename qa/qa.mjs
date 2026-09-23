#!/usr/bin/env node
// Multi-app QA crawl against apps.gtm-360.com (Deal Room + Content Engine).
//   PLAYWRIGHT_PATH=<dir> node qa/qa.mjs [baseUrl]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw = process.env.PLAYWRIGHT_PATH;
const { chromium } = pw ? require(pw) : require('playwright');

const BASE = process.argv[2] || 'https://apps.gtm-360.com';

const APPS = [
  {
    name: 'Deal Room',
    routes: ['/deal-room/', '/deal-room/deals', '/deal-room/deals/d-northwind', '/deal-room/deals/d-helix', '/deal-room/diagnose', '/deal-room/plays', '/deal-room/manager'],
  },
  {
    name: 'Content Engine',
    routes: ['/content-engine/', '/content-engine/login', '/content-engine/privacy', '/content-engine/terms', '/content-engine/create', '/content-engine/engine', '/content-engine/radar', '/content-engine/seo'],
  },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
let cur = '';
page.on('pageerror', (e) => pageErrors.push(`${cur} :: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`${cur} :: ${m.text()}`); });

const failures = [];
const links = new Set();

for (const app of APPS) {
  console.log(`\n=== ${app.name} ===`);
  for (const r of app.routes) {
    cur = r;
    const before = consoleErrors.length + pageErrors.length;
    let status = 0;
    try {
      const resp = await page.goto(BASE + r, { waitUntil: 'networkidle', timeout: 45000 });
      status = resp ? resp.status() : 0;
    } catch (e) { failures.push(`${r} : goto ${e.message.slice(0, 80)}`); console.log(`  ✗ ${r} goto failed`); continue; }
    const finalPath = new URL(page.url()).pathname;
    const title = await page.title().catch(() => '');
    const h1c = await page.locator('h1').count().catch(() => 0);
    const h1 = h1c ? (await page.locator('h1').first().textContent().catch(() => '')) || '' : '';
    const imgs = await page.locator('img').evaluateAll((im) => im.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'))).catch(() => []);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href'))).catch(() => []);
    for (const h of hrefs) if (h && h.startsWith('/') && !h.startsWith('//')) links.add(h.split('#')[0].split('?')[0]);

    const issues = [];
    if (status !== 200) issues.push(`HTTP ${status}`);
    if (!title) issues.push('no title');
    if (h1c === 0) issues.push('no h1');
    if (imgs.length) issues.push(`broken imgs ${imgs.slice(0, 2).join(',')}`);
    const errs = consoleErrors.length + pageErrors.length - before;
    if (errs) issues.push(`${errs} console/page err`);
    const redirected = finalPath !== r && !r.endsWith('/') ? ` (→${finalPath})` : '';
    if (issues.length) { failures.push(`${r} : ${issues.join(' | ')}`); console.log(`  ✗ ${r} : ${issues.join(' | ')}`); }
    else console.log(`  ✓ ${r} | h1="${h1.slice(0, 34)}"${redirected}`);
  }
}

// Link integrity
console.log(`\n=== link integrity (${links.size} internal links) ===`);
const dead = [];
for (const l of links) {
  try { const r = await fetch(BASE + l, { redirect: 'manual' }); if (r.status >= 400) dead.push(`${l} → ${r.status}`); }
  catch (e) { dead.push(`${l} → ${e.message.slice(0, 40)}`); }
}
dead.slice(0, 20).forEach((d) => console.log('  ✗ ' + d));
console.log(dead.length ? `  ${dead.length} dead` : '  ✓ none');

console.log(`\nSUMMARY: ${failures.length} route failures | ${dead.length} dead links | ${new Set(consoleErrors).size} console errors | ${new Set(pageErrors).size} page errors`);
if (failures.length) { console.log('FAILURES:'); failures.forEach((f) => console.log('  - ' + f)); }
if (pageErrors.length) { console.log('PAGE ERRORS:'); [...new Set(pageErrors)].slice(0, 10).forEach((e) => console.log('  - ' + e)); }

await browser.close();
process.exit(failures.length || dead.length ? 1 : 0);
