// Emails the Step 02 workbook (public/data/step02_service_requests.xlsx) after a pipeline run,
// with a short summary of the run in the message body.
//
// Sends through any SMTP server with curl, so nothing extra is installed. With Gmail, use an
// app password (Google account > Security > 2-Step Verification > App passwords).
//
// Env (repository secrets):
//   SMTP_USERNAME   the account that sends the email, e.g. you@gmail.com
//   SMTP_PASSWORD   its app password
//   REPORT_EMAIL_TO one or more recipients, separated by commas
//   SMTP_HOST       optional, default smtp.gmail.com
//   SMTP_PORT       optional, default 465 (SSL); 587 uses STARTTLS
// Without SMTP_USERNAME, SMTP_PASSWORD and REPORT_EMAIL_TO the step is skipped.
//
// DRY_RUN=1 writes the message to email-preview.eml instead of sending it.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const WORKBOOK = 'public/data/step02_service_requests.xlsx';
const PAGE_URL = process.env.DATASETS_PAGE_URL || 'https://interior-design-journey-91.vercel.app/datasets';

const { SMTP_USERNAME: user, SMTP_PASSWORD: password, REPORT_EMAIL_TO: to, DRY_RUN: dryRun } = process.env;
const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT) || 465;
const from = process.env.SMTP_FROM || user;
const recipients = String(to ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!dryRun && (!user || !password || !recipients.length)) {
  console.log('::notice::Step 02 email skipped - add the SMTP_USERNAME, SMTP_PASSWORD and REPORT_EMAIL_TO repository secrets to receive it.');
  process.exit(0);
}
if (!existsSync(WORKBOOK)) {
  console.log(`::warning::${WORKBOOK} not found - nothing to email.`);
  process.exit(0);
}

const readJson = async (file, fallback) => (existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback);
const excel = await readJson('public/data/excel-summary.json', {});
const run = (await readJson('public/data/pipeline-runs.json', { runs: [] })).runs?.[0];

const colombo = (iso, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', ...opts }).format(new Date(iso));
const when = run?.startedAt ?? new Date().toISOString();
const day = colombo(when, { day: 'numeric', month: 'short', year: 'numeric' });
const fileDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date(when));

const step2 = excel.step2 ?? { rows: 0, withContact: 0, top: [] };
const industryList = (step2.industries ?? []).map((i) => i.label);
const industryName = industryList.length ? industryList.join(' & ') : 'Service';
const subject = `Step 02 ${industryName} requests - ${day} (${step2.rows} request${step2.rows === 1 ? '' : 's'}, ${step2.withContact} with phone)`;

const sourceLine = (name, s) =>
  !s ? null : `  ${name}: ${s.status === 'success' ? `+${s.newPosts} new posts` : s.status}${s.message ? ` (${s.message})` : ''}`;
const RESULT = { success: 'Succeeded', partial: 'Partly failed', failed: 'Failed', skipped: 'Nothing collected' };

const body = [
  'Hi,',
  '',
  `The pipeline ran on ${colombo(when, { dateStyle: 'medium', timeStyle: 'short' })} (Sri Lanka time). The Step 02 workbook is attached.`,
  '',
  `Step 02: ${step2.rows} ${industryName.toLowerCase()} request${step2.rows === 1 ? '' : 's'}, ${step2.withContact} with a contact number (ranked first in each tab).`,
  ...((step2.industries ?? []).length > 1
    ? step2.industries.map((i) => `  ${i.label}: ${i.rows} (${i.withContact} with phone)`)
    : []),
  ...(run
    ? [
        '',
        `Run result: ${RESULT[run.result] ?? run.result}, ${run.newPosts ?? 0} new posts, ${run.totalRows ?? '?'} rows in total.`,
        ...['facebook', 'x', 'reddit', 'bluesky'].map((k) => sourceLine(k[0].toUpperCase() + k.slice(1), run.sources?.[k])).filter(Boolean),
      ]
    : []),
  ...(step2.top?.length
    ? ['', 'Top requests:', ...step2.top.map((t) => `  ${t.rank}. ${t.text}${t.postUrl ? `\n     ${t.postUrl}` : ''}`)]
    : []),
  '',
  `All downloads and the run history: ${PAGE_URL}`,
  ...(run?.url ? [`Run log: ${run.url}`] : []),
  '',
  'Requests are picked by keyword, so check each one before acting on it.',
].join('\r\n');

// ---- MIME message ------------------------------------------------------------------------------
const b64Lines = (buf) => buf.toString('base64').replace(/.{1,76}/g, '$&\r\n');
const encodeHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`);
const boundary = `step2-${randomUUID()}`;
const attachmentName = `step02_service_requests_${fileDate}.xlsx`;
const domain = String(from ?? 'localhost').split('@')[1] || 'localhost';

const message = [
  `From: ${encodeHeader('Datasets pipeline')} <${from ?? 'pipeline@localhost'}>`,
  `To: ${recipients.join(', ') || 'preview@localhost'}`,
  `Subject: ${encodeHeader(subject)}`,
  `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
  `Message-ID: <${randomUUID()}@${domain}>`,
  'MIME-Version: 1.0',
  `Content-Type: multipart/mixed; boundary="${boundary}"`,
  '',
  `--${boundary}`,
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  b64Lines(Buffer.from(body, 'utf8')),
  `--${boundary}`,
  `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${attachmentName}"`,
  'Content-Transfer-Encoding: base64',
  `Content-Disposition: attachment; filename="${attachmentName}"`,
  '',
  b64Lines(await readFile(WORKBOOK)),
  `--${boundary}--`,
  '',
].join('\r\n');

if (dryRun) {
  await writeFile('email-preview.eml', message);
  console.log(`Dry run: wrote email-preview.eml (${subject}).`);
  process.exit(0);
}

// ---- send --------------------------------------------------------------------------------------
const url = port === 465 ? `smtps://${host}:${port}` : `smtp://${host}:${port}`;
const args = ['--silent', '--show-error', '--url', url, '--ssl-reqd', '--mail-from', from, '--user', `${user}:${password}`, '--upload-file', '-'];
for (const r of recipients) args.push('--mail-rcpt', r);

const code = await new Promise((resolve) => {
  const curl = spawn('curl', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  curl.on('error', (error) => {
    console.error(`Could not start curl: ${error.message}`);
    resolve(1);
  });
  curl.on('close', resolve);
  curl.stdin.end(message);
});
if (code !== 0) {
  console.error('Sending the Step 02 email failed - check SMTP_USERNAME, SMTP_PASSWORD and REPORT_EMAIL_TO.');
  process.exit(1);
}
console.log(`Emailed ${attachmentName} to ${recipients.length} recipient(s).`);
