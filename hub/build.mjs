// The Pages project is only a domain + proxy to the apps-hub Worker, which owns
// all routing. The deployed directory is intentionally minimal.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const dist = path.join(here, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>GTM-360 Apps</title>');
console.log('✓ hub dist ready (proxy in functions/[[path]].js)');
