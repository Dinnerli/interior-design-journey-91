// Adds this pipeline run to public/data/pipeline-runs.json, the run history the /datasets page lists.
// Runs as the last step of the weekly workflow (also when an earlier step failed), after the
// Step 01 / Step 02 workbooks are rebuilt, so the entry describes what the run produced.
//
// Env (set by GitHub Actions): RUN_STARTED_AT, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT, GITHUB_EVENT_NAME,
// GITHUB_SERVER_URL, GITHUB_REPOSITORY. Locally they can be left out.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PATHS } from './lib/schema.mjs';

const RUNS_FILE = 'public/data/pipeline-runs.json';
const MAX_RUNS = 200;

const readJson = async (file, fallback) => (existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback);

const startedAt = process.env.RUN_STARTED_AT || new Date().toISOString();
const finishedAt = new Date().toISOString();
const startedMs = Date.parse(startedAt);

const SOURCES = { facebook: PATHS.status, x: PATHS.xStatus, reddit: PATHS.redditStatus, bluesky: PATHS.blueskyStatus };
const sources = {};
for (const [name, file] of Object.entries(SOURCES)) {
  const s = await readJson(file, {});
  // A status file only describes this run if it was written after the run started.
  const thisRun = s.lastRunAt && Date.parse(s.lastRunAt) >= startedMs - 60_000;
  sources[name] = thisRun
    ? { status: s.status, newPosts: s.newPosts ?? 0, ...(s.status !== 'success' && s.message ? { message: s.message } : {}) }
    : { status: 'not run', newPosts: 0 };
}

const statuses = Object.values(sources).map((s) => s.status);
const result = statuses.includes('failed') || statuses.includes('not run')
  ? statuses.includes('success') ? 'partial' : 'failed'
  : statuses.includes('success') ? 'success' : 'skipped';

const summary = await readJson(PATHS.summary, {});
const excel = await readJson('public/data/excel-summary.json', {});
const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: attempt } = process.env;
const event = process.env.GITHUB_EVENT_NAME;

const entry = {
  id: runId ? `${runId}-${attempt ?? 1}` : `local-${finishedAt}`,
  startedAt,
  finishedAt,
  trigger: event === 'schedule' ? 'scheduled' : event ? 'manual' : 'local',
  result,
  newPosts: Object.values(sources).reduce((n, s) => n + (s.newPosts || 0), 0),
  totalRows: summary.totalRows ?? null,
  serviceRequests: excel.step2?.rows ?? null,
  serviceRequestsWithContact: excel.step2?.withContact ?? null,
  sources,
  url: server && repo && runId ? `${server}/${repo}/actions/runs/${runId}` : null,
};

const history = await readJson(RUNS_FILE, { runs: [] });
history.runs = [entry, ...(history.runs ?? []).filter((r) => r.id !== entry.id)].slice(0, MAX_RUNS);
history.updatedAt = finishedAt;
await writeFile(RUNS_FILE, JSON.stringify(history, null, 2) + '\n');

console.log(`Recorded run ${entry.id}: ${result}, ${entry.newPosts} new posts, ${entry.serviceRequests ?? '?'} service requests.`);
