// Rebuilds public/data/combined_dataset.csv (global datasets + weekly Facebook-group posts)
// and public/data/dataset-summary.json, which the /datasets page reads.
// Does not download anything: it only merges files already in the repo.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseCsv, toCsv } from './lib/csv.mjs';
import { COLUMNS, PATHS } from './lib/schema.mjs';

const config = JSON.parse(await readFile(PATHS.globalConfig, 'utf8'));
const globalRows = [];
const datasets = [];

for (const ds of config.datasets ?? []) {
  const file = path.join(PATHS.globalDir, ds.file);
  if (!existsSync(file)) {
    console.log(`::warning::${file} is missing - run the "Refresh global datasets" workflow.`);
    datasets.push({ id: ds.id, license: ds.license ?? '', rows: 0, missing: true });
    continue;
  }
  const raw = parseCsv(await readFile(file, 'utf8'));
  for (const record of raw) {
    const row = { source: 'global', dataset: ds.id };
    for (const [unified, sourceColumn] of Object.entries(ds.columns ?? {})) row[unified] = record[sourceColumn] ?? '';
    globalRows.push(row);
  }
  datasets.push({ id: ds.id, license: ds.license ?? '', rows: raw.length });
}

if (!existsSync(PATHS.groupsCsv)) await writeFile(PATHS.groupsCsv, toCsv([], COLUMNS));
const groupRows = parseCsv(await readFile(PATHS.groupsCsv, 'utf8'));

const combined = [...groupRows, ...globalRows];
await writeFile(PATHS.combinedCsv, toCsv(combined, COLUMNS));

const groupsConfig = JSON.parse(await readFile(PATHS.groupsConfig, 'utf8'));
const preview = ({ source, timestamp, text = '', category, sentiment, language, likes, group_name }) => ({
  source,
  timestamp,
  text: text.length > 160 ? text.slice(0, 157) + '...' : text,
  category,
  sentiment,
  language,
  likes,
  group_name,
});

await writeFile(
  PATHS.summary,
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      columns: COLUMNS,
      totalRows: combined.length,
      globalRows: globalRows.length,
      facebookGroupRows: groupRows.length,
      datasets,
      groups: (groupsConfig.groups ?? []).map((g) => ({
        label: g.label ?? g.url,
        category: g.category ?? '',
        enabled: g.enabled !== false,
        rows: groupRows.filter((r) => r.group_url === g.url).length,
      })),
      preview: [...groupRows.slice(0, 5), ...globalRows.slice(0, 8)].map(preview),
    },
    null,
    2,
  ) + '\n',
);

console.log(`Combined dataset: ${combined.length} rows (${globalRows.length} global, ${groupRows.length} from Facebook groups).`);
