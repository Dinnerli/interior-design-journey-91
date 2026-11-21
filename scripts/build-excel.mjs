// Builds the two Excel downloads on the /datasets page from public/data/combined_dataset.csv
// (run scripts/build-combined.mjs first):
//
//   Step 01 - public/data/step01_all_posts.xlsx
//     Every row, plus one tab per pipeline run date (Sri Lanka time) holding the posts that run
//     collected, and a tab for the global dataset, which is not collected by the weekly runs.
//
//   Step 02 - public/data/step02_service_requests.xlsx
//     Step 01 filtered to posts asking for a service in each active industry of
//     data/step2-industries.json (one tab per industry; see scripts/lib/service-requests.mjs),
//     ranked with posts that include a phone number first.
//
// Also writes public/data/excel-summary.json for the page.

import { readFile, writeFile } from 'node:fs/promises';
import { parseCsv } from './lib/csv.mjs';
import { COLUMNS, PATHS } from './lib/schema.mjs';
import { writeXlsx } from './lib/xlsx.mjs';
import { classifyServiceRequest, loadIndustries } from './lib/service-requests.mjs';

const OUT = {
  step1: 'public/data/step01_all_posts.xlsx',
  step2: 'public/data/step02_service_requests.xlsx',
  summary: 'public/data/excel-summary.json',
};

const SOURCE_LABEL = { 'facebook-group': 'Facebook group', x: 'X', reddit: 'Reddit', bluesky: 'Bluesky', global: 'Global dataset' };
const runDateOf = (collectedAt) => {
  const d = new Date(collectedAt);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(d);
};

const WIDTHS = { text: 80, post_url: 45, group_url: 40, group_name: 28, dataset: 30, timestamp: 22, collected_at: 24 };
const NUMBER_COLUMNS = new Set(['likes', 'comments', 'shares']);
const ROW_COLUMNS = [
  { header: 'run_date', key: 'run_date', width: 12 },
  ...COLUMNS.map((key) => ({
    header: key,
    key,
    width: WIDTHS[key] ?? 14,
    type: key.endsWith('_url') ? 'link' : NUMBER_COLUMNS.has(key) ? 'number' : 'text',
  })),
];

const rows = parseCsv(await readFile(PATHS.combinedCsv, 'utf8')).map((r) => ({ ...r, run_date: r.source === 'global' ? '' : runDateOf(r.collected_at) }));

// ---- Step 01 -------------------------------------------------------------------------------
const collected = rows.filter((r) => r.source !== 'global');
const globalRows = rows.filter((r) => r.source === 'global');
const byRun = new Map();
for (const r of collected) {
  const key = r.run_date || 'unknown date';
  if (!byRun.has(key)) byRun.set(key, []);
  byRun.get(key).push(r);
}
const runDates = [...byRun.keys()].sort().reverse(); // newest first

const runs = runDates.map((date) => {
  const list = byRun.get(date);
  const count = (source) => list.filter((r) => r.source === source).length;
  return { date, facebook: count('facebook-group'), x: count('x'), reddit: count('reddit'), bluesky: count('bluesky'), total: list.length };
});

await writeXlsx(OUT.step1, [
  {
    name: 'Summary',
    columns: [
      { header: 'Tab (run date)', key: 'date', width: 18 },
      { header: 'Facebook groups', key: 'facebook', width: 16, type: 'number' },
      { header: 'X', key: 'x', width: 8, type: 'number' },
      { header: 'Reddit', key: 'reddit', width: 10, type: 'number' },
      { header: 'Bluesky', key: 'bluesky', width: 10, type: 'number' },
      { header: 'Total rows', key: 'total', width: 12, type: 'number' },
    ],
    rows: [
      ...runs,
      { date: 'Global dataset', total: globalRows.length },
      { date: 'All rows', total: rows.length },
    ],
  },
  { name: 'All rows', columns: ROW_COLUMNS, rows },
  ...runDates.map((date) => ({ name: date, columns: ROW_COLUMNS, rows: byRun.get(date) })),
  { name: 'Global dataset', columns: ROW_COLUMNS, rows: globalRows },
]);

// ---- Step 02 -------------------------------------------------------------------------------
// One tab per active industry in data/step2-industries.json. The same post is often shared in
// several groups: keep one row per industry and list where else it appeared.
const industries = loadIndustries();
const dedupeKey = (text) => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 300);

const STEP2_COLUMNS = [
  { header: 'Rank', key: 'rank', width: 7, type: 'number' },
  { header: 'Has contact number', key: 'has_contact', width: 12 },
  { header: 'Contact numbers', key: 'contact_numbers', width: 26 },
  { header: 'Relevance', key: 'relevance', width: 10, type: 'number' },
  { header: 'Service', key: 'service', width: 30 },
  { header: 'Request signals', key: 'request_signals', width: 24 },
  { header: 'Run date', key: 'run_date', width: 12 },
  { header: 'Source', key: 'source', width: 14 },
  { header: 'Posted in', key: 'posted_in', width: 32 },
  { header: 'Posted at', key: 'timestamp', width: 22 },
  { header: 'Post text', key: 'text', width: 90 },
  { header: 'Post URL', key: 'post_url', width: 45, type: 'link' },
];

function rankFor(industry) {
  const leads = new Map();
  for (const r of rows) {
    const hit = classifyServiceRequest(r.text, industry);
    if (!hit) continue;
    const key = dedupeKey(r.text);
    const where = r.group_name || SOURCE_LABEL[r.source] || r.source;
    const existing = leads.get(key);
    if (existing) {
      if (!existing.places.includes(where)) existing.places.push(where);
      continue;
    }
    leads.set(key, { key, row: r, hit, places: [where] });
  }
  return [...leads.values()]
    .sort(
      (a, b) =>
        Number(b.hit.phones.length > 0) - Number(a.hit.phones.length > 0) ||
        b.hit.score - a.hit.score ||
        String(b.row.timestamp).localeCompare(String(a.row.timestamp)),
    )
    .map(({ key, row, hit, places }, i) => ({
      dedupe: key,
      rank: i + 1,
      has_contact: hit.phones.length ? 'Yes' : 'No',
      contact_numbers: hit.phones.join('; '),
      relevance: hit.score,
      service: hit.service.join(', '),
      request_signals: hit.request.join(', '),
      run_date: row.run_date,
      source: SOURCE_LABEL[row.source] ?? row.source,
      posted_in: places.join('; '),
      timestamp: row.timestamp,
      text: row.text,
      post_url: row.post_url,
    }));
}

const results = industries.map((industry) => ({ industry, ranked: rankFor(industry) }));
const labels = industries.map((i) => i.label);

await writeXlsx(OUT.step2, [
  ...results.map(({ industry, ranked }) => ({ name: industry.label, columns: STEP2_COLUMNS, rows: ranked })),
  {
    name: 'How rows were picked',
    columns: [{ header: 'Notes', key: 'note', width: 120 }],
    rows: [
      `Industries in this workbook (one tab each): ${labels.join(', ')}.`,
      'Source: every row of the Step 01 workbook (all runs plus the global dataset).',
      "A post is kept for an industry when a request phrase (looking for, seeking, need, anyone recommend, quotation, අවශ්‍යයි, හොයනවා ...) points at one of that industry's services in the same sentence,",
      'and its request wording outweighs advert or job-post wording (we offer, contact us, for sale, prices, we are hiring ...) and ideas/advice-only wording.',
      'Relevance = 3 x request signals + service terms - 3 x advert signals (- 2 when only ideas or advice are asked for). Posts scoring under 3 are left out.',
      'Ranking: posts with a phone number first, then by relevance, then newest first.',
      'The same text shared in several groups is listed once per tab; "Posted in" lists every place it appeared.',
      ...results.map(({ industry }) => `${industry.label} services: ${industry.services.map(([label]) => label).join(', ')}.`),
      'Matching is keyword based, so check each lead before acting on it. Industries and their terms are set in data/step2-industries.json.',
    ].map((note) => ({ note })),
  },
]);

// ---- Summary for the page ------------------------------------------------------------------
const snippet = (text) => {
  const t = String(text)
    .normalize('NFKC')
    .replace(/\+?\d[\d\s-]{7,}\d/g, '[number in download]') // phone numbers stay in the workbook only
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > 160 ? t.slice(0, 157) + '...' : t;
};

// Totals count each post once, even when it matches several industries.
const unique = new Map();
for (const { ranked } of results) for (const r of ranked) if (!unique.has(r.dedupe)) unique.set(r.dedupe, r);
const top = results
  .flatMap(({ industry, ranked }) => ranked.map((r) => ({ industry: industry.label, r })))
  .sort(
    (a, b) =>
      Number(b.r.has_contact === 'Yes') - Number(a.r.has_contact === 'Yes') ||
      b.r.relevance - a.r.relevance ||
      String(b.r.timestamp).localeCompare(String(a.r.timestamp)),
  )
  .filter(({ r }, i, all) => all.findIndex((x) => x.r.dedupe === r.dedupe) === i)
  .slice(0, 5);

await writeFile(
  OUT.summary,
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      step1: { file: '/data/step01_all_posts.xlsx', totalRows: rows.length, globalRows: globalRows.length, runs },
      step2: {
        file: '/data/step02_service_requests.xlsx',
        industries: results.map(({ industry, ranked }) => ({
          key: industry.key,
          label: industry.label,
          rows: ranked.length,
          withContact: ranked.filter((r) => r.has_contact === 'Yes').length,
        })),
        rows: unique.size,
        withContact: [...unique.values()].filter((r) => r.has_contact === 'Yes').length,
        // Phone numbers stay in the download only, not on the page.
        top: top.map(({ industry, r }, i) => ({
          rank: i + 1,
          industry,
          hasContact: r.has_contact === 'Yes',
          service: r.service,
          source: r.source,
          postedIn: r.posted_in,
          timestamp: r.timestamp,
          text: snippet(r.text),
          postUrl: r.post_url,
        })),
      },
    },
    null,
    2,
  ) + '\n',
);

console.log(
  `Step 01: ${rows.length} rows in ${runDates.length} run tab(s) (${runDates.join(', ')}). Step 02: ${results
    .map(({ industry, ranked }) => `${industry.label} ${ranked.length} (${ranked.filter((r) => r.has_contact === 'Yes').length} with phone)`)
    .join(', ')}.`,
);
