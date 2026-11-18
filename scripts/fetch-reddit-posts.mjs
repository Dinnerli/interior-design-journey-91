// Weekly pipeline, Reddit part: collects recent posts from the subreddits listed in
// data/reddit-sources.json and merges them into public/data/reddit_posts.csv.
//
// Uses the official Reddit API, so REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are needed.
// Reddit refuses unauthenticated feed and JSON requests (404/403), so without them the
// step is skipped with a warning rather than failing the whole pipeline.
//
// Env: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET,
//      LOOKBACK_DAYS (default 8), MAX_POSTS_PER_SUBREDDIT (default 100)

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseCsv, toCsv } from './lib/csv.mjs';
import { COLUMNS, PATHS } from './lib/schema.mjs';
import { mergeRows } from './lib/rows.mjs';

// Reddit asks API clients for a "<platform>:<app id>:<version>" user agent.
const USER_AGENT = 'github-actions:interior-design-datasets-pipeline:v1.1';
const cleanName = (n) => String(n || '').trim().replace(/^https?:\/\/(www\.)?reddit\.com/i, '').replace(/^\/?r\//i, '').replace(/\/.*$/, '');

const baseRow = (subreddit, collectedAt) => ({
  source: 'reddit',
  sentiment: '',
  language: '',
  shares: '',
  is_spam: '',
  group_name: `r/${cleanName(subreddit.name)}`,
  group_category: subreddit.category ?? '',
  group_url: `https://www.reddit.com/r/${cleanName(subreddit.name)}/`,
  collected_at: collectedAt,
});

/** Turn one post from the official API listing ("t3" child data) into a row of the shared schema. */
export function mapApiPost(post, subreddit, collectedAt) {
  const text = [post.title, post.selftext].map((s) => String(s ?? '').trim()).filter(Boolean).join('\n\n');
  if (!post.name || !text) return null;
  return {
    ...baseRow(subreddit, collectedAt),
    dataset: 'reddit-api:v1',
    post_id: post.name,
    timestamp: new Date(post.created_utc * 1000).toISOString(),
    text,
    category: post.link_flair_text ?? '',
    has_link: post.is_self ? 0 : 1,
    likes: post.score ?? 0,
    comments: post.num_comments ?? 0,
    post_url: `https://www.reddit.com${post.permalink}`,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Reddit rate-limits hard: wait as long as it asks, then try again.
async function redditFetch(url, headers) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
    if (res.status !== 429 || attempt === 4) return res;
    const wait = Number(res.headers.get('retry-after') ?? res.headers.get('x-ratelimit-reset')) || 30 * attempt;
    console.log(`Reddit asked to slow down - waiting ${Math.min(wait, 120)}s (attempt ${attempt} of 3).`);
    await sleep(Math.min(wait, 120) * 1000);
  }
}

async function getToken(id, secret) {
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Reddit sign-in failed (${res.status}) - check REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET`);
  return (await res.json()).access_token;
}

async function collectViaApi(subreddit, token, { since, maxPosts }, collectedAt) {
  const rows = [];
  let after;
  do {
    const params = new URLSearchParams({ limit: '100', raw_json: '1' });
    if (after) params.set('after', after);
    const res = await redditFetch(`https://oauth.reddit.com/r/${cleanName(subreddit.name)}/new?${params}`, {
      Authorization: `Bearer ${token}`,
    });
    if (!res.ok) throw new Error(`Reddit API r/${cleanName(subreddit.name)} failed (${res.status})`);
    const listing = (await res.json()).data;
    const posts = listing.children.map((c) => c.data);
    const recent = posts.filter((p) => p.created_utc * 1000 >= since);
    rows.push(...recent.map((p) => mapApiPost(p, subreddit, collectedAt)).filter(Boolean));
    after = recent.length === posts.length ? listing.after : null; // stop once posts get older than the window
  } while (after && rows.length < maxPosts);
  return rows.slice(0, maxPosts);
}

const writeStatus = (status) => writeFile(PATHS.redditStatus, JSON.stringify(status, null, 2) + '\n');

async function main() {
  const startedAt = new Date().toISOString();
  const config = JSON.parse(await readFile(PATHS.redditConfig, 'utf8'));
  const subreddits = (config.subreddits ?? []).filter((s) => cleanName(s.name) && s.enabled !== false);
  const base = { lastRunAt: startedAt, subredditsConfigured: subreddits.length };

  if (subreddits.length === 0) {
    console.log(`::warning::No subreddits in ${PATHS.redditConfig} - nothing to collect from Reddit.`);
    await writeStatus({ ...base, status: 'skipped', message: 'No subreddits configured yet.', newPosts: 0 });
    return;
  }

  const { REDDIT_CLIENT_ID: id, REDDIT_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) {
    const message =
      'REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are not set - Reddit refuses requests without them. Add them as repository secrets to collect Reddit posts.';
    console.log(`::warning::${message}`);
    await writeStatus({ ...base, status: 'skipped', message, newPosts: 0 });
    return;
  }

  try {
    const lookbackDays = Number(process.env.LOOKBACK_DAYS) || 8;
    const options = {
      since: Date.now() - lookbackDays * 86_400_000,
      maxPosts: Number(process.env.MAX_POSTS_PER_SUBREDDIT) || 100,
    };
    const token = await getToken(id, secret);
    const mode = 'api';

    const incoming = [];
    const perSubreddit = [];
    const failures = [];
    for (const subreddit of subreddits) {
      const entry = { name: cleanName(subreddit.name), category: subreddit.category ?? '', postsThisRun: 0 };
      perSubreddit.push(entry);
      try {
        const rows = await collectViaApi(subreddit, token, options, startedAt);
        incoming.push(...rows);
        entry.postsThisRun = rows.length;
        console.log(`r/${entry.name}: ${rows.length} posts`);
      } catch (error) {
        // One subreddit failing must not throw away what the others returned.
        entry.error = String(error.message ?? error);
        failures.push(entry.error);
        console.log(`::warning::${entry.error}`);
      }
    }
    if (failures.length === subreddits.length) throw new Error(failures.join('; '));

    const existing = existsSync(PATHS.redditCsv) ? parseCsv(await readFile(PATHS.redditCsv, 'utf8')) : [];
    const { rows, added } = mergeRows(existing, incoming);
    await writeFile(PATHS.redditCsv, toCsv(rows, COLUMNS));
    await writeStatus({ ...base, status: 'success', ...(failures.length ? { message: failures.join('; ') } : {}), mode, postsReturned: incoming.length, newPosts: added, totalPosts: rows.length, perSubreddit });
    console.log(`Done: ${incoming.length} Reddit posts returned, ${added} new, ${rows.length} total.`);
  } catch (error) {
    await writeStatus({ ...base, status: 'failed', message: String(error.message ?? error), newPosts: 0 });
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
