#!/usr/bin/env node
/**
 * Quick Supabase connectivity check (run after filling .env.local).
 * Usage: npm run supabase:check
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("❌ Missing .env.local — copy from .env.example");
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    vars[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!url || url.includes("your-project") || !key || key.includes("your-anon")) {
  console.error("❌ Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/restaurants?slug=eq.demo&select=id,name,slug`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

if (!res.ok) {
  console.error("❌ Supabase request failed:", res.status, await res.text());
  process.exit(1);
}

const rows = await res.json();
if (!rows.length) {
  console.warn("⚠️  Connected, but demo restaurant missing — run migrations in SUPABASE_SETUP.md");
  process.exit(1);
}

console.log("✅ Supabase connected. Demo restaurant:", rows[0].name);
