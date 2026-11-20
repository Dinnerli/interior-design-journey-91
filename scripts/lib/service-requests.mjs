// Step 02 filter: picks posts where someone is asking for an architectural or construction
// service, and pulls out any phone numbers so those leads can be ranked first.
//
// A post qualifies when a request phrase (looking for, need, anyone recommend, අවශ්‍යයි...) points
// at a service (architect, contractor, house plan, mason...) in the same sentence - "looking for an
// architect", "ස්ප්‍රේ පේන්ටර්වරයෙකු අවශ්‍යයි" - and that outweighs advert/job-post wording
// (we offer, for sale, we're hiring...) and ideas/advice-only wording.
// Matching is keyword based, in English, Singlish and Sinhala; tune the lists below.

const SERVICE_TERMS = [
  ['architect', /\barchitect(?:s|ural\s+(?:design|services?|firm|plans?|drawings?))?\b/i],
  ['contractor/builder', /\b(?:contractors?|builders?|building\s+company|construction\s+company)\b/i],
  ['construction', /\bconstruct(?:ion|ing)?\b/i],
  ['house/building plan', /\b(?:house|home|building|approval|2d|3d)\s+plans?\b|\bplan\s+(?:approval|drawings?)\b/i],
  ['build a house', /\bbuild(?:ing)?\s+(?:a|an|my|our)?\s*(?:new\s+)?(?:house|home|annex|villa|cabana|building|shop|office)\b/i],
  ['renovation', /\b(?:renovat\w*|remodel\w*|refurbish\w*|house\s+extension)\b/i],
  ['interior designer', /\b(?:interior\s+)?designers?\b|\binterior\s+design\s+(?:services?|company|firm|work)\b|\b(?:office|house|home|shop|showroom)\s+(?:re)?design(?:ed)?\b/i],
  ['engineer', /\b(?:structural|civil)\s+engineers?\b/i],
  ['quantity surveyor/estimate', /\bquantity\s+surveyors?\b|\bBOQ\b|\bcost\s+estimate\b/i],
  ['mason', /\bmasons?\b|\bmasonry\b|\bbaas\b/i],
  ['carpenter', /\bcarpent\w*|\bjoinery\b/i],
  ['plumber', /\bplumb(?:er|ers|ing)\b/i],
  ['electrician', /\belectricians?\b|\bhouse\s+wiring\b/i],
  ['painter', /\b(?:house\s+|wall\s+|spray\s+)?painters?\b/i],
  ['roof/ceiling', /\broof(?:ing|s)?\b|\bceilings?\b/i],
  ['tiling', /\btil(?:er|ers|ing)\b|\btile\s+work\b/i],
  ['waterproofing', /\bwater\s*proof\w*/i],
  ['aluminium/steel work', /\balumini?um\s+(?:work|fabricat\w*|windows?|doors?)|\bsteel\s+(?:work|fabricat\w*)|\bwelding\b/i],
  ['landscaping', /\blandscap\w*/i],
  ['ගෘහ නිර්මාණ (architecture)', /ගෘහ\s*නිර්මාණ/],
  ['ඉදිකිරීම් (construction)', /ඉදිකිරීම|ඉදි\s*කිරීම|ඉදිකරන/],
  ['කොන්ත්‍රාත් (contract)', /කොන්ත්‍රාත්|කොන්ට්‍රැක්ට/],
  ['බාස් (mason)', /බාස්/],
  ['වඩු (carpenter)', /වඩු/],
  ['පේන්ටර් (painter)', /පේන්ටර්/],
  ['ප්ලම්බර් (plumber)', /ප්ලම්බ/],
  ['සැලසුම් (plan)', /නිවාස\s*සැලසුම|ගෙයක\s*ප්ලෑන්|ප්ලෑන්|සැලැස්ම/],
  ['ගෙයක් හදන්න (build a house)', /ගෙයක්\s*හද|ගෙදර\s*හද|නිවසක්\s*ඉදි/],
  ['ටයිල් (tiling)', /ටයිල්/],
  ['වහල (roof)', /වහල/],
];

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
 * Classify one post. Returns null when it is not an architectural/construction service request,
 * otherwise the matched terms, a relevance score and any phone numbers.
 */
export function classifyServiceRequest(text) {
  const t = String(text ?? '').normalize('NFKC');
  if (t.trim().length < 15) return null;
  const service = matches(t, SERVICE_TERMS);
  if (!service.length) return null;

  // Only count request phrases that point at a service in the same sentence.
  const request = new Set();
  const asked = new Set();
  let advice = false;
  for (const [label, re, direction] of REQUEST_TERMS) {
    for (const m of t.matchAll(re)) {
      const window = requestWindow(t, m.index, m.index + m[0].length, direction);
      const linked = matches(window, SERVICE_TERMS);
      if (!linked.length) continue;
      request.add(label);
      linked.forEach((s) => asked.add(s));
      if (ADVICE_TERMS.test(window)) advice = true; // "looking for ideas for my kitchen renovation"
    }
  }
  if (!request.size) return null;

  const offer = matches(t, OFFER_TERMS);
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
