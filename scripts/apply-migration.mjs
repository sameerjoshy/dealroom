#!/usr/bin/env node
// Apply a SQL migration to the shared Supabase project via the Management API.
//   node scripts/apply-migration.mjs migrations/001_dr_init.sql
// Reads SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from the environment.

import fs from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const file = process.argv[2];

if (!token || !ref) { console.error('Missing SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF'); process.exit(1); }
if (!file || !fs.existsSync(file)) { console.error('Usage: node scripts/apply-migration.mjs <file.sql>'); process.exit(1); }

const sql = fs.readFileSync(file, 'utf8');
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
if (res.ok) {
  console.log(`✓ applied ${file} (${res.status})`);
} else {
  console.error(`✗ ${res.status}: ${text.slice(0, 800)}`);
  process.exit(1);
}
