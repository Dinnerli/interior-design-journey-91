import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarClock, Download, ExternalLink, FileSpreadsheet, Loader2, Phone, Play } from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

const WORKFLOW_URL =
  'https://github.com/Dinnerli/interior-design-journey-91/actions/workflows/weekly-facebook-groups.yml';

const FILES = {
  combined: '/data/combined_dataset.csv',
  groups: '/data/sl_facebook_groups.csv',
  x: '/data/x_posts.csv',
  reddit: '/data/reddit_posts.csv',
  bluesky: '/data/bluesky_posts.csv',
  step1: '/data/step01_all_posts.xlsx',
  step2: '/data/step02_service_requests.xlsx',
};

interface ExcelSummary {
  builtAt: string;
  step1: {
    totalRows: number;
    leadRows?: number;
    globalRows: number;
    runs: { date: string; facebook: number; x: number; reddit: number; bluesky: number; total: number }[];
  };
  step2: {
    rows: number;
    withContact: number;
    top: {
      rank: number;
      hasContact: boolean;
      service: string;
      source: string;
      postedIn: string;
      timestamp: string;
      text: string;
      postUrl: string;
    }[];
  };
}

type SourceKey = 'facebook' | 'x' | 'reddit' | 'bluesky';

interface PipelineRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  trigger: 'scheduled' | 'manual' | 'local';
  result: 'success' | 'partial' | 'failed' | 'skipped';
  newPosts: number | null;
  totalRows: number | null;
  serviceRequests: number | null;
  serviceRequestsWithContact: number | null;
  sources: Record<SourceKey, { status: string; newPosts: number; message?: string }> | null;
  note?: string;
  url: string | null;
}

const RUN_RESULT_LABEL: Record<PipelineRun['result'], string> = {
  success: 'Succeeded',
  partial: 'Partly failed',
  failed: 'Failed',
  skipped: 'Nothing collected',
};

const RUN_RESULT_DOT: Record<PipelineRun['result'], string> = {
  success: 'bg-emerald-600',
  partial: 'bg-amber-500',
  failed: 'bg-red-600',
  skipped: 'bg-neutral-400',
};

const SOURCE_COLUMNS: { key: SourceKey; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'bluesky', label: 'Bluesky' },
];

const formatDuration = (from: string, to: string) => {
  const seconds = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const sourceCell = (source?: { status: string; newPosts: number; message?: string }) => {
  if (!source) return <span className="text-neutral-400">—</span>;
  if (source.status === 'success') return <span className="tabular-nums">+{source.newPosts.toLocaleString()}</span>;
  return (
    <span className={source.status === 'failed' ? 'text-red-700' : 'text-neutral-500'} title={source.message}>
      {source.status === 'failed' ? 'Failed' : source.status === 'skipped' ? 'Skipped' : 'Not run'}
    </span>
  );
};

const StepLabel =({ step }: { step: string }) => (
  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Step {step}</p>
);

const linkClass = 'text-sm underline underline-offset-4 text-neutral-600 hover:text-neutral-900';

interface PreviewRow {
  source: string;
  timestamp: string;
  text: string;
  category: string;
  sentiment: string;
  language: string;
  likes: string | number;
  group_name?: string;
}

interface SourceEntry {
  label: string;
  category: string;
  enabled: boolean;
  rows: number;
}

interface DatasetSummary {
  builtAt: string;
  totalRows: number;
  globalRows: number;
  facebookGroupRows: number;
  xRows: number;
  redditRows?: number;
  blueskyRows?: number;
  datasets: { id: string; license: string; rows: number; missing?: boolean }[];
  groups: SourceEntry[];
  xProfiles: SourceEntry[];
  subreddits?: SourceEntry[];
  blueskySearches?: SourceEntry[];
  preview: PreviewRow[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

// The workflow's cron is "0 2 * * 1": every Monday at 02:00 UTC.
function nextScheduledRun(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
  const daysUntilMonday = (8 - next.getUTCDay()) % 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

const formatDateTime = (value?: string | Date) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';


const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="border border-neutral-200 p-5">
    <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
    <p className="mt-2 text-2xl font-display font-medium">{value}</p>
    {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
  </div>
);

const SourceList = ({ title, entries, emptyText }: { title: string; entries?: SourceEntry[]; emptyText: React.ReactNode }) => (
  <div>
    <h3 className="text-lg font-display font-medium mb-4">{title}</h3>
    {entries && entries.length === 0 ? (
      <p className="border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">{emptyText}</p>
    ) : (
      <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
        {(entries ?? []).map((entry) => (
          <li key={entry.label} className="py-3 flex items-start justify-between gap-4 text-sm">
            <span>
              {entry.label}
              <span className="ml-2 text-xs uppercase tracking-wider text-neutral-500">
                {entry.category}
                {!entry.enabled && ' · paused'}
              </span>
            </span>
            <span className="shrink-0 text-neutral-500">{entry.rows.toLocaleString()} rows</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Datasets = () => {
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const summary = useQuery({
    queryKey: ['dataset-summary'],
    queryFn: () => fetchJson<DatasetSummary>('/data/dataset-summary.json'),
  });
  const excel = useQuery({
    queryKey: ['excel-summary'],
    queryFn: () => fetchJson<ExcelSummary>('/data/excel-summary.json'),
  });
  const history = useQuery({
    queryKey: ['pipeline-runs'],
    queryFn: () => fetchJson<{ runs: PipelineRun[] }>('/data/pipeline-runs.json'),
  });

  const data = summary.data;
  const workbooks = excel.data;
  const runs = history.data?.runs ?? [];
  const lastRun = runs[0];
  const runDates = workbooks?.step1.runs.map((r) => r.date) ?? [];
  const count = (n?: number | null) => (n === undefined || n === null ? '—' : n.toLocaleString());

  const triggerPipeline = async () => {
    setTriggering(true);
    const { error } = await supabase.functions.invoke('trigger-pipeline', { body: {} });
    setTriggering(false);

    if (!error) {
      toast.success('Pipeline started', {
        description: 'New posts appear here once the run finishes, usually within 10–20 minutes.',
      });
      return;
    }
    // Edge function errors carry the HTTP response; read the message the function sent back.
    const response = (error as { context?: Response }).context;
    const body = response instanceof Response ? await response.json().catch(() => null) : null;
    toast.error('Could not start the pipeline', {
      description: body?.error ?? 'The trigger is not reachable. You can start the run from GitHub instead.',
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-24 sm:py-28 md:py-32">
        <div className="text-center mb-12 sm:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-display font-medium mb-4"
          >
            Social Posts Dataset
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-neutral-600 max-w-2xl mx-auto px-4 text-sm sm:text-base"
          >
            A global Facebook text-classification dataset combined with posts collected every week from Sri Lankan
            and EPFS Facebook groups, X profiles, Reddit communities and Bluesky searches.
          </motion.p>
        </div>

        {summary.isError && (
          <p className="mb-8 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            The dataset summary could not be loaded. The download below may still work.
          </p>
        )}

        {/* Step 01 and Step 02 downloads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col">
            <StepLabel step="01" />
            <h2 className="mt-2 text-xl font-display font-medium">Download the dataset</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Every row: {count(data?.globalRows)} global posts, {count(data?.facebookGroupRows)} from the Facebook
              groups, {count(data?.xRows)} from X, {count(data?.redditRows)} from Reddit and {count(data?.blueskyRows)}{' '}
              from Bluesky. Author names are not included.
            </p>
            <p className="mt-3 text-sm text-neutral-600 flex-1">
              The Excel workbook has an <span className="text-neutral-900">All rows</span> tab, then one tab per
              pipeline run with the posts that run collected
              {runDates.length > 0 && (
                <>
                  {' '}
                  ({runDates.length} so far: {runDates.join(', ')})
                </>
              )}
              . Every row has an <span className="text-neutral-900">is_lead</span> column (Yes/No) marking posts
              that ask for an architectural or construction service
              {workbooks?.step1.leadRows !== undefined && <> ({count(workbooks.step1.leadRows)} so far)</>}.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <a href={FILES.step1} download="step01_all_posts.xlsx">
                  <FileSpreadsheet /> Download Excel
                </a>
              </Button>
              <a href={FILES.combined} download="combined_dataset.csv" className={linkClass}>
                CSV
              </a>
              <a href={FILES.groups} download="sl_facebook_groups.csv" className={linkClass}>
                Facebook groups only
              </a>
              <a href={FILES.x} download="x_posts.csv" className={linkClass}>
                X posts only
              </a>
              <a href={FILES.reddit} download="reddit_posts.csv" className={linkClass}>
                Reddit only
              </a>
              <a href={FILES.bluesky} download="bluesky_posts.csv" className={linkClass}>
                Bluesky only
              </a>
            </div>
          </div>

          <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col">
            <StepLabel step="02" />
            <h2 className="mt-2 text-xl font-display font-medium">Architecture &amp; construction requests</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Step 01 filtered down to posts where someone is asking for an architect, contractor, builder, house plan,
              renovation or a trade such as a mason, carpenter or plumber. Adverts and job posts are left out.
            </p>
            <p className="mt-3 text-sm text-neutral-600 flex-1">
              {workbooks
                ? `${count(workbooks.step2.rows)} requests found, ${count(workbooks.step2.withContact)} with a contact number. Those are ranked at the top.`
                : 'Requests with a contact number are ranked at the top.'}{' '}
              Matching is keyword based, so check each lead.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <a href={FILES.step2} download="step02_service_requests.xlsx">
                  <Download /> Download Excel
                </a>
              </Button>
              {workbooks && (
                <span className="text-xs text-neutral-500">Built {formatDateTime(workbooks.builtAt)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-10">
          <div className="border border-neutral-200 p-6 sm:p-8 flex flex-col">
            <h2 className="text-xl font-display font-medium">Weekly pipeline</h2>
            <p className="mt-2 text-sm text-neutral-600 flex-1">
              Runs by itself every Monday and collects the Sri Lankan and EPFS Facebook groups, the X profiles, Reddit and Bluesky. Run it now
              if you don&apos;t want to wait.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-neutral-700">
              <CalendarClock className="h-4 w-4 shrink-0" />
              Next scheduled run: {formatDateTime(nextScheduledRun())}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button size="lg" variant="outline" onClick={triggerPipeline} disabled={triggering}>
                {triggering ? <Loader2 className="animate-spin" /> : <Play />} Run pipeline now
              </Button>
              <a
                href={WORKFLOW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4 text-neutral-600 hover:text-neutral-900"
              >
                Open on GitHub <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Stat label="Total rows" value={count(data?.totalRows)} hint={data ? `Built ${formatDateTime(data.builtAt)}` : undefined} />
          <Stat label="Global dataset rows" value={count(data?.globalRows)} />
          <Stat label="Facebook group rows" value={count(data?.facebookGroupRows)} />
          <Stat label="X post rows" value={count(data?.xRows)} />
          <Stat label="Reddit rows" value={count(data?.redditRows)} />
          <Stat label="Bluesky rows" value={count(data?.blueskyRows)} />
          <Stat
            label="Last pipeline run"
            value={lastRun ? RUN_RESULT_LABEL[lastRun.result] : history.isLoading ? '—' : 'Not run yet'}
            hint={
              lastRun
                ? `${formatDateTime(lastRun.startedAt)}${lastRun.newPosts !== null ? ` · ${count(lastRun.newPosts)} new posts` : ''}`
                : undefined
            }
          />
          <Stat
            label="Pipeline runs"
            value={count(history.data ? runs.length : undefined)}
            hint={lastRun ? 'Listed below with date and time' : undefined}
          />
        </div>

        {/* Run history */}
        <h3 className="text-lg font-display font-medium mb-1">Pipeline run history</h3>
        <p className="mb-4 text-sm text-neutral-600">
          Every run, scheduled or started by hand, newest first. Each run also rebuilds the Step 01 and Step 02 Excel
          files. Times are shown in your time zone.
        </p>
        <div className="mb-12 border border-neutral-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date &amp; time</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Result</TableHead>
                {SOURCE_COLUMNS.map((s) => (
                  <TableHead key={s.key} className="text-right">
                    {s.label}
                  </TableHead>
                ))}
                <TableHead className="text-right whitespace-nowrap">Step 02 requests</TableHead>
                <TableHead className="text-right">Took</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(r.startedAt)}</TableCell>
                  <TableCell className="capitalize">{r.trigger}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${RUN_RESULT_DOT[r.result]}`} />
                      {RUN_RESULT_LABEL[r.result]}
                    </span>
                  </TableCell>
                  {r.sources ? (
                    SOURCE_COLUMNS.map((s) => (
                      <TableCell key={s.key} className="text-right whitespace-nowrap">
                        {sourceCell(r.sources?.[s.key])}
                      </TableCell>
                    ))
                  ) : (
                    <TableCell colSpan={SOURCE_COLUMNS.length} className="text-xs text-neutral-500">
                      {r.note ?? 'No details recorded.'}
                    </TableCell>
                  )}
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {r.serviceRequests === null ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <>
                        {r.serviceRequests.toLocaleString()}
                        {r.serviceRequestsWithContact ? (
                          <span className="ml-1 text-xs text-neutral-500">({r.serviceRequestsWithContact} with phone)</span>
                        ) : null}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap text-neutral-500">
                    {formatDuration(r.startedAt, r.finishedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs underline underline-offset-4 text-neutral-600 hover:text-neutral-900 whitespace-nowrap"
                      >
                        Log <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {history.isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-neutral-500 py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!history.isLoading && runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-neutral-500 py-8">
                    No runs recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Sources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          <div>
            <h3 className="text-lg font-display font-medium mb-4">Global datasets</h3>
            <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
              {(data?.datasets ?? []).map((ds) => (
                <li key={ds.id} className="py-3 flex items-start justify-between gap-4 text-sm">
                  <a
                    href={`https://huggingface.co/datasets/${ds.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline underline-offset-4 hover:text-neutral-600"
                  >
                    {ds.id}
                  </a>
                  <span className="shrink-0 text-neutral-500">
                    {ds.missing ? 'Not downloaded' : `${count(ds.rows)} rows`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <SourceList
            title="Facebook groups collected weekly"
            entries={data?.groups}
            emptyText={<>No groups added yet. Add public group URLs to <code>data/facebook-groups.json</code>.</>}
          />
          <SourceList
            title="X profiles collected weekly"
            entries={data?.xProfiles}
            emptyText={<>No profiles added yet. Add handles to <code>data/x-profiles.json</code>.</>}
          />
          <SourceList
            title="Reddit communities collected weekly"
            entries={data?.subreddits}
            emptyText={<>No subreddits added yet. Add them to <code>data/reddit-sources.json</code>.</>}
          />
          <SourceList
            title="Bluesky searches collected weekly"
            entries={data?.blueskySearches}
            emptyText={<>No searches added yet. Add them to <code>data/bluesky-sources.json</code>.</>}
          />
        </div>

        {/* Step 02 preview (phone numbers stay in the download) */}
        <h3 className="text-lg font-display font-medium mb-4">Top requests from Step 02</h3>
        {workbooks && workbooks.step2.top.length === 0 ? (
          <p className="mb-12 border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            No architecture or construction requests in the collected posts yet.
          </p>
        ) : (
          <ol className="mb-12 divide-y divide-neutral-200 border-y border-neutral-200">
            {(workbooks?.step2.top ?? []).map((lead) => (
              <li key={lead.rank} className="py-4 flex gap-4 text-sm">
                <span className="w-6 shrink-0 tabular-nums text-neutral-400">{lead.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-neutral-900 break-words">{lead.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                    <span className="uppercase tracking-wider">{lead.service}</span>
                    <span>{lead.postedIn}</span>
                    <span>{lead.timestamp?.slice(0, 10)}</span>
                    {lead.hasContact && (
                      <span className="inline-flex items-center gap-1 text-neutral-900">
                        <Phone className="h-3 w-3" /> Contact number in download
                      </span>
                    )}
                    {lead.postUrl && (
                      <a
                        href={lead.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-neutral-900"
                      >
                        View post <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </p>
                </div>
              </li>
            ))}
            {excel.isLoading && <li className="py-6 text-center text-sm text-neutral-500">Loading…</li>}
          </ol>
        )}

        {/* Preview */}
        <h3 className="text-lg font-display font-medium mb-4">Preview</h3>
        <div className="border border-neutral-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="min-w-[280px]">Text</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Likes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.preview ?? []).map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="whitespace-nowrap">{row.group_name || row.source}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.timestamp?.slice(0, 10)}</TableCell>
                  <TableCell>{row.text}</TableCell>
                  <TableCell>{row.category || '—'}</TableCell>
                  <TableCell>{row.sentiment || '—'}</TableCell>
                  <TableCell>{row.language || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.likes}</TableCell>
                </TableRow>
              ))}
              {summary.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-neutral-500 py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Datasets;
