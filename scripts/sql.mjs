#!/usr/bin/env node
// Ad-hoc SQL against the shared Supabase project (Management API).
//   node scripts/sql.mjs "select count(*) from dr_deals"

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const query = process.argv.slice(2).join(' ');
if (!token || !ref || !query) { console.error('Usage: node scripts/sql.mjs "<sql>"'); process.exit(1); }

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log(res.status, text.slice(0, 2000));
process.exit(res.ok ? 0 : 1);
