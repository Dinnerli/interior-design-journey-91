// Loads a local .env file (ignored by git) so the pipeline scripts can run on a
// developer machine. In GitHub Actions the values come from repository secrets.
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

/** First non-empty value among the given environment variable names. */
export const envValue = (...names) => names.map((n) => process.env[n]?.trim()).find(Boolean);
