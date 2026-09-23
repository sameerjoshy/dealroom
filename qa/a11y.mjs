#!/usr/bin/env node
// axe-core accessibility scan for apps.gtm-360.com pages.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw = process.env.PLAYWRIGHT_PATH;
const { chromium } = pw ? require(pw) : require('playwright');

const BASE = process.argv[2] || 'https://apps.gtm-360.com';
const PAGES = [
  '/', '/deal-room/', '/deal-room/deals', '/deal-room/deals/d-northwind',
  '/deal-room/diagnose', '/deal-room/plays', '/deal-room/manager',
  '/content-engine/', '/content-engine/login',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
let total = 0; const byRule = {};
for (const p of PAGES) {
  try {
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 40000 });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await page.evaluate(async () => await axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
    const v = res.violations || [];
    total += v.length;
    for (const x of v) byRule[x.id] = (byRule[x.id] || 0) + x.nodes.length;
    console.log(`${v.length ? '✗' : '✓'} ${p} — ${v.length} violations`);
    v.forEach((x) => console.log(`    [${x.impact}] ${x.id}: ${x.nodes.length} — ${x.help}`));
  } catch (e) { console.log(`! ${p} — ${e.message.slice(0, 70)}`); }
}
console.log(`\nTOTAL violations across ${PAGES.length} pages: ${total}`);
if (Object.keys(byRule).length) console.log('By rule:', JSON.stringify(byRule));
await browser.close();
