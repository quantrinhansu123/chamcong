/**
 * Export data từ Supabase hiện tại → supabase/export-data.sql
 * Chạy: node scripts/export-supabase-data.mjs
 *
 * Đọc VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY từ .env hoặc .env.local
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(filename) {
  try {
    const raw = readFileSync(resolve(process.cwd(), filename), 'utf8');
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
    // ignore missing file
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Thiếu VITE_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const TABLES = [
  'users',
  'projects',
  'work_sessions',
  'features',
  'tasks',
  'project_checkin_locations',
  'departments',
  'employees',
  'products',
  'product_locations',
  'attendance_records',
];

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function fetchAllRows(table) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        ...headers,
        Range: `${from}-${to}`,
        Prefer: 'count=exact',
      },
    });

    if (res.status === 404 || res.status === 406) {
      return { ok: false, missing: true, rows: [] };
    }

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, missing: false, error: `${res.status} ${text}`, rows: [] };
    }

    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return { ok: true, missing: false, rows };
}

function buildInsert(table, rows) {
  if (!rows.length) return `-- ${table}: 0 rows\n`;

  const columns = Object.keys(rows[0]);
  const colList = columns.map(quoteIdent).join(', ');
  const values = rows.map((row) => {
    const cells = columns.map((col) => sqlLiteral(row[col]));
    return `(${cells.join(', ')})`;
  });

  // Chia nhỏ để SQL Editor không quá nặng
  const chunkSize = 200;
  const parts = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    parts.push(
      `insert into public.${quoteIdent(table)} (${colList})\nvalues\n  ${chunk.join(',\n  ')}\non conflict do nothing;`,
    );
  }

  return `-- ${table}: ${rows.length} rows\n${parts.join('\n\n')}\n`;
}

async function main() {
  console.log('Export từ:', url);

  const sections = [
    '-- ═══════════════════════════════════════════════════════════════════════════',
    '-- Jarviz Attendance — DATA EXPORT',
    `-- Nguồn: ${url}`,
    `-- Thời điểm: ${new Date().toISOString()}`,
    '-- Cách dùng:',
    '--   1) Chạy supabase/init-all.sql trên Supabase MỚI trước',
    '--   2) Chạy file này (export-data.sql) để nạp dữ liệu cũ',
    '-- ═══════════════════════════════════════════════════════════════════════════',
    '',
    'begin;',
    '',
  ];

  const summary = [];

  for (const table of TABLES) {
    process.stdout.write(`  ${table} ... `);
    const result = await fetchAllRows(table);

    if (result.missing) {
      console.log('không có bảng');
      summary.push({ table, count: 0, note: 'missing' });
      sections.push(`-- ${table}: bảng không tồn tại trên nguồn\n`);
      continue;
    }

    if (!result.ok) {
      console.log('LỖI', result.error);
      summary.push({ table, count: 0, note: result.error });
      sections.push(`-- ${table}: lỗi export — ${result.error}\n`);
      continue;
    }

    console.log(`${result.rows.length} rows`);
    summary.push({ table, count: result.rows.length, note: 'ok' });
    sections.push(buildInsert(table, result.rows));
  }

  sections.push('commit;');
  sections.push('');
  sections.push("notify pgrst, 'reload schema';");
  sections.push('');

  const outDir = resolve(process.cwd(), 'supabase');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'export-data.sql');
  writeFileSync(outPath, sections.join('\n'), 'utf8');

  const jsonPath = resolve(outDir, 'export-data.json');
  writeFileSync(jsonPath, `${JSON.stringify({ source: url, exportedAt: new Date().toISOString(), summary }, null, 2)}\n`, 'utf8');

  console.log('\nĐã ghi:');
  console.log(' ', outPath);
  console.log(' ', jsonPath);
  console.log('\nTóm tắt:');
  for (const item of summary) {
    console.log(`  - ${item.table}: ${item.count}${item.note !== 'ok' ? ` (${item.note})` : ''}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
