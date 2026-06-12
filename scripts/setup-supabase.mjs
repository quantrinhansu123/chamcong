/**
 * Kiểm tra kết nối Supabase và bảng đã tồn tại.
 * Chạy: npm run db:seed
 *
 * Biến môi trường (trong .env.local):
 *   SUPABASE_URL hoặc VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

loadEnv();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Thiếu SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env.local');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

async function checkTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers });
  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table}: ${res.status} ${text}`);
  }
  return true;
}

async function countRows(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) return null;
  const range = res.headers.get('content-range');
  if (!range) return null;
  const total = range.split('/')[1];
  return total === '*' ? null : Number(total);
}

async function main() {
  console.log('Kiểm tra Supabase:', url);

  const tables = ['departments', 'employees', 'attendance_records'];
  for (const table of tables) {
    const exists = await checkTable(table);
    if (!exists) {
      console.error(`\nBảng "${table}" chưa tồn tại. Hãy chạy supabase/init-all.sql trong Supabase SQL Editor.\n`);
      process.exit(1);
    }
    const count = await countRows(table);
    console.log(`✓ ${table}${count !== null ? ` (${count} bản ghi)` : ''}`);
  }

  console.log('\nKết nối OK. Không có dữ liệu mẫu — thêm nhân sự qua ứng dụng.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
