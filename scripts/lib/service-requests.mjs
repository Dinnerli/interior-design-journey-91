// Step 02 filter: picks posts where someone is asking for a service in one of the industries in
// data/step2-industries.json (architecture, construction, ...), and pulls out any phone numbers so
// those leads can be ranked first.
//
// A post qualifies for an industry when a request phrase (looking for, need, anyone recommend,
// අවශ්‍යයි...) points at one of that industry's services in the same sentence - "looking for an
// architect", "ගෘහ නිර්මාණ ශිල්පියෙකු අවශ්‍යයි" - and that outweighs advert/job-post wording
// (we offer, for sale, we're hiring...) and ideas/advice-only wording.
// The request, advert and phone rules below are shared by every industry; the service terms live in
// the settings file, so a new industry needs no code change.

import { readFileSync } from 'node:fs';

export const INDUSTRIES_FILE = 'data/step2-industries.json';

const escapeRe = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Turn a settings-file term ("architect*", "house plan*", "ගෘහ නිර්මාණ") into [label, RegExp]. */
export function compileTerm(term) {
  const { match, label } = typeof term === 'string' ? { match: term, label: term } : term;
  const text = String(match ?? '').trim();
  if (!text) throw new Error(`Empty term in ${INDUSTRIES_FILE}`);
  const latin = /^[\x20-\x7e]+$/.test(text);
  const body = text
    .split(/\s+/)
    .map((word) => word.split('*').map(escapeRe).join(latin ? '\\w*' : '\\S*'))
    .join(latin ? '\\s+' : '\\s*');
  // English terms match whole words; Sinhala/Tamil terms also match inside longer words (පේන්ටර්වරයෙකු).
  const source = latin ? `\\b${body}${text.endsWith('*') ? '' : '\\b'}` : body;
  return [label ?? text.replace(/\*/g, ''), new RegExp(source, 'i')];
}

/** Read the industries settings and compile the active ones, in the order they are listed. */
export function loadIndustries(file = INDUSTRIES_FILE) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const active = config.active ?? Object.keys(config.industries ?? {});
  if (!active.length) throw new Error(`${file}: 'active' lists no industries`);
  return active.map((key) => {
    const industry = config.industries?.[key];
    if (!industry) throw new Error(`${file}: '${key}' is in 'active' but has no entry under 'industries'`);
    if (!industry.services?.length) throw new Error(`${file}: industry '${key}' has no 'services' terms`);
    return {
      key,
      label: industry.label ?? key,
      services: industry.services.map(compileTerm),
      requests: (industry.requests ?? []).map((t) => {
        const [label, re] = compileTerm(t);
        return [label, new RegExp(re.source, 'gi'), 'after'];
      }),
      exclude: (industry.exclude ?? []).map(compileTerm),
    };
  });
}

// English phrases come before the service they ask for ("looking for an architect");
// Sinhala puts the verb last ("බාස් කෙනෙක් අවශ්‍යයි"), so the service is searched before it.
const REQUEST_TERMS = [
  ['looking for', /\blooking\s+for\b/gi, 'after'],
  ['seeking', /\bseeking\b/gi, 'after'],
  ['need', /\b(?:i|we)\s+(?:need|want|require)\b|\bneed(?:ed|s)?\s+(?:a|an|some|someone|help|good|reliable|experienced|the)\b|^\s*need\b/gim, 'after'],
  ['wanted/required', /\b(?:wanted|required|urgently)\b/gi, 'around'],
  ['anyone know/recommend', /\b(?:any\s*(?:one|body)|someone|somebody)\s+(?:know|recommend|suggest|who|can|could)\b|\b(?:can|could)\s+(?:any\s*one|anybody|someone|somebody|you)\s+(?:recommend|suggest|share)\b|\brecommend(?:ation)?s?\s+(?:for|please|pls)\b|\bany\s+recommendations?\b/gi, 'after'],
  ['quotation request', /\b(?:need|send|get|looking\s+for|request(?:ing)?)\s+(?:a\s+|some\s+)?quot(?:e|es|ation|ations)\b/gi, 'around'],
  ['අවශ්‍යයි (needed)', /අවශ්‍යයි|අවශ්‍යව\s*ඇත|අවශ්‍ය\s*වී\s*ඇත/g, 'before'],
  ['හොයනවා (looking for)', /හොයනවා|සොයනවා|හොයාගන්න|සොයා\s*ගැනීමට|කෙනෙක්\s*ඕනේ|කෙනෙක්\s*ඕන/g, 'before'],
  ['දන්න කෙනෙක් (anyone know)', /දන්න\s*කෙනෙක්|කවුරු\s*හරි/g, 'after'],
];

// Asking for ideas or opinions (common in Reddit design threads) is not hiring anyone.
const ADVICE_TERMS = /\b(?:ideas?|advice|suggestions?|feedback|thoughts|opinions?|inspiration|help\s+with|how\s+(?:to|should\s+i)\s+(?:style|decorate|arrange|fill|lay\s*out))\b/i;

const SENTENCE_END = /[.!?\n]/;
const WINDOW = 120;

/** The text a request phrase refers to: the rest of its sentence (English) or the part before it (Sinhala). */
function requestWindow(text, start, end, direction) {
  if (direction === 'before') {
    const before = text.slice(Math.max(0, start - WINDOW), start);
    const cut = Math.max(...[...before.matchAll(/[.!?\n]/g)].map((m) => m.index), -1);
    return before.slice(cut + 1) + text.slice(start, end);
  }
  const after = text.slice(end, end + WINDOW);
  const stop = after.search(SENTENCE_END);
  const tail = stop === -1 ? after : after.slice(0, stop);
  if (direction === 'after') return text.slice(start, end) + tail;
  const before = text.slice(Math.max(0, start - WINDOW / 2), start);
  const cut = Math.max(...[...before.matchAll(/[.!?\n]/g)].map((m) => m.index), -1);
  return before.slice(cut + 1) + text.slice(start, end) + tail;
}

const OFFER_TERMS = [
  ['we offer', /\bwe\s+(?:offer|provide|are\s+(?:a|an|the|offering|providing|specialists?)|do\s+all|specialize|specialise|undertake|build|design|turn|deliver|have)\b/i],
  ['our services', /\bour\s+(?:services?|team|projects?|company|showroom|collection|products?|packages?)\b/i],
  ['contact us', /\b(?:contact|call|whatsapp|inbox|dm|message)\s+(?:us|now|today)\b/i],
  ['order/sale', /\border\s+now\b|\bfor\s+(?:sale|rent)\b|\bbuy\s+now\b|\bbook\s+(?:your|a|now)\b|\bfree\s+consultation\b/i],
  ['price/offer', /\b(?:discount|special\s+offer|best\s+price|packages?\s+(?:start|from))\b|\brs\.?\s*\d/i],
  ['job post', /\bwe['’]?re\s+hiring\b|\bwe\s+are\s+hiring\b|\bvacanc(?:y|ies)\b|\bjoin\s+(?:our|the)\s+team\b|\bapply\s+(?:now|via|here|before)\b|\bsalary\b/i],
  ['rhetorical ad question', /\blooking\s+for\s+[^.?!\n]{0,80}\?/i],
  ['advert (Sinhala)', /අප\s*සතුව|අපි\s*කරනවා|අපෙන්|ඇණවුම්|මිලට|ලබා\s*දෙනවා/],
];

const matches = (text, terms) => terms.filter(([, re]) => re.test(text)).map(([label]) => label);

// Phone numbers. Text is NFKC-normalised first so styled digits like 𝟎𝟕𝟒 become 074.
const PHONE_PATTERNS = [
  // Sri Lankan mobile: 07X XXX XXXX, +94 7X XXX XXXX
  { re: /(?<![\d+])(?:\+?94[\s-]?|0094[\s-]?|0)7\d(?:[\s-]?\d){7}(?!\d)/g, kind: 'lk' },
  // Sri Lankan landline: 0XX XXX XXXX, +94 XX XXX XXXX
  { re: /(?<![\d+])(?:\+?94[\s-]?|0094[\s-]?|0)(?!7)[1-9]\d[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g, kind: 'lk' },
  // Other countries written with a + prefix
  { re: /\+(?!94)\d{1,3}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d){6,10}(?!\d)/g, kind: 'intl' },
  // Bare 10-digit mobile numbers (e.g. Indian 9XXXXXXXXX)
  { re: /(?<![\d+])[6-9]\d{9}(?!\d)/g, kind: 'bare' },
];

const formatLk = (digits) => {
  const local = '0' + digits.replace(/^(?:0094|94|0)/, '');
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
};

/** All distinct phone numbers in a post, formatted for reading. */
export function extractPhones(text) {
  const normalised = String(text ?? '').normalize('NFKC');
  const found = new Map();
  let masked = normalised;
  for (const { re, kind } of PHONE_PATTERNS) {
    for (const match of masked.matchAll(re)) {
      const digits = match[0].replace(/\D/g, '');
      const pretty = kind === 'lk' ? formatLk(digits) : kind === 'intl' ? `+${digits}` : digits;
      const key = pretty.replace(/\D/g, '').slice(-9);
      if (!found.has(key)) found.set(key, pretty);
    }
    masked = masked.replace(re, (m) => ' '.repeat(m.length)); // later patterns must not re-read a number
  }
  return [...found.values()];
}

/**
 * Classify one post for one industry (from loadIndustries()). Returns null when it is not a request
 * for that industry's services, otherwise the matched terms, a relevance score and any phone numbers.
 */
export function classifyServiceRequest(text, industry) {
  const t = String(text ?? '').normalize('NFKC');
  if (t.trim().length < 15) return null;
  const services = industry.services;
  const service = matches(t, services);
  if (!service.length) return null;

  // Only count request phrases that point at a service in the same sentence.
  const request = new Set();
  const asked = new Set();
  let advice = false;
  for (const [label, re, direction] of [...REQUEST_TERMS, ...industry.requests]) {
    for (const m of t.matchAll(re)) {
      const window = requestWindow(t, m.index, m.index + m[0].length, direction);
      const linked = matches(window, services);
      if (!linked.length) continue;
      request.add(label);
      linked.forEach((s) => asked.add(s));
      if (ADVICE_TERMS.test(window)) advice = true; // "looking for ideas for my kitchen renovation"
    }
  }
  if (!request.size) return null;

  const offer = [...matches(t, OFFER_TERMS), ...matches(t, industry.exclude)];
  const score = request.size * 3 + service.length - offer.length * 3 - (advice ? 2 : 0);
  if (score < 3) return null;
  return {
    score,
    service: [...asked, ...service.filter((s) => !asked.has(s))],
    request: [...request],
    offer,
    advice,
    phones: extractPhones(t),
  };
}
