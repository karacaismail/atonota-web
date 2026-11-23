#!/usr/bin/env node
/**
 * Hareket kapısı. `src/design/` dışında sabit süre, `cubic-bezier(...)`, `steps(...)` ya da
 * `ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear` anahtar sözcüğü yazılırsa başarısız olur.
 * Bütün süre ve eğriler `src/design/motion.ts` içindedir; bileşenler CSS değişkenlerini ya da
 * tokenları kullanır.
 *
 * Kapı metni satır satır değil, bildirim bildirim tarar. Bildirim `transition` ya da `animation`
 * ile başlar ve noktalı virgüle (CSS), metin değerinin sonuna ya da nesne değerinin kapanışına (JS)
 * kadar sürer. Prettier'in birden çok satıra böldüğü değerler de böylece yakalanır. Web Animations
 * API (`el.animate(kareler, { duration, easing })`) çağrıları da taranır.
 *
 * Satır içi izin: bildirimin içine `motion-gate: allow sahip=<iş> neden=<en az 10 karakter>`
 * yorumu yazılır. Yorum yalnız kendi bildirimini susturur. Sahip ya da neden eksikse kapı yine
 * ihlal verir. İhlali olmayan bildirimdeki izin yorumu gereksizdir ve ihlal sayılır.
 *
 * Kullanım: node scripts/motion-gate.mjs [kök]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.less', '.html']);
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.git',
  '.pane',
  '.serena',
]);

/** Muaf yollar: tasarım kaynağı, token katmanı, testler ve betikler. */
export function isMotionExempt(file) {
  const f = file.split(sep).join('/');
  return (
    f.startsWith('src/design/') ||
    f.startsWith('design/') ||
    f.startsWith('tests/') ||
    f.startsWith('scripts/') ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) ||
    /\/e2e\//.test(f)
  );
}

/**
 * Bildirim başlangıcı: CSS (`transition-duration:`) ya da JS (`transitionDuration:`, `'transition':`,
 * `transition =`, JSX `transition=`). Grup 1 özellik adı, grup 2 ek (süre, gecikme, eğri), grup 3 ayraç.
 */
const DECLARATION_START =
  /(?<![-\w])(transition|animation)(-duration|-delay|-timing-function|Duration|Delay|TimingFunction)?['"]?\s*([:=])\s*/g;

/** Web Animations API ve hareket kitaplıkları: `el.animate(kareler, seçenekler)`. */
const ANIMATE_CALL = /(?<![-\w])animate\s*\(/g;

/** Sabit süre: `200ms`, `0.3s`, `.2s`, `1.5s`. */
const DURATION_RE = /(?<![-\w.])(?:\d+(?:\.\d+)?|\.\d+)m?s(?![-\w])/;
/** Çıplak sayı (JS): `200`, `0.3`, `.3`. */
const NUMBER_ONLY_RE = /^(?:\d+(?:\.\d+)?|\.\d+)\s*(?:[,;)}\]]|$)/;
const KEYWORD_RE = /(?<![-\w])(ease-in-out|ease-in|ease-out|ease|linear)(?![-\w])/;
/** Seçenek nesnesinde sayı süre: `duration: 200`, `delay: .3`. */
const OPTION_NUMBER_RE =
  /(?<![-\w])(?:duration|delay)['"]?\s*:\s*(?:\d+(?:\.\d+)?|\.\d+)(?![-\w.])/;
/** Seçenek nesnesinde eğri sözcüğü: `ease: 'linear'`, `easing: "ease-in"`. */
const OPTION_KEYWORD_RE =
  /(?<![-\w])(?:ease|easing|timingFunction)['"]?\s*:\s*['"`](ease-in-out|ease-in|ease-out|ease|linear)['"`]/;
/** Satır içi izin yorumu: sahip ve neden zorunludur. */
const ALLOW_RE = /motion-gate:\s*allow(?:\s+sahip=(\S+)\s+neden=([^*\n]+?))?\s*(?:\*\/|$|\n)/m;
const ALLOW_MIN_REASON = 10;

const CLOSER = { '{': '}', '[': ']', '(': ')' };

/** Tırnaklı metnin kapanışından sonraki konumu döner. */
function skipString(text, start) {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length && text[i] !== quote) {
    if (text[i] === '\\') i += 1;
    i += 1;
  }
  return i + 1;
}

/** `text[start]` açılış ayracıdır; eşleşen kapanıştan sonraki konumu döner. Metinler atlanır. */
function skipBalanced(text, start) {
  const stack = [CLOSER[text[start]]];
  let i = start + 1;
  while (i < text.length && stack.length) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') {
      i = skipString(text, i);
      continue;
    }
    if (CLOSER[c]) stack.push(CLOSER[c]);
    else if (c === stack[stack.length - 1]) stack.pop();
    i += 1;
  }
  return i;
}

/**
 * Bildirimin değerini ve bittiği konumu döner.
 * - Tırnaklı metin tırnakla sınırlıdır (`quoted`).
 * - Nesne ya da dizi değeri eşleşen kapanışa kadar sürer (`object`); JSX `{{ ... }}` dahil.
 * - Diğer değerler CSS'te `;{}` ayracına, JS'te ayrıca `,` ve satır sonuna kadar sürer.
 */
function readValue(text, start, isJs) {
  const first = text[start];
  if (first === "'" || first === '"' || first === '`') {
    const end = skipString(text, start);
    return { value: text.slice(start + 1, end - 1), end, quoted: true, object: false };
  }
  if (CLOSER[first]) {
    const end = skipBalanced(text, start);
    return { value: text.slice(start, end), end, quoted: false, object: true };
  }
  const stops = isJs ? ';{},\n' : ';{}';
  let i = start;
  while (i < text.length && !stops.includes(text[i])) i += 1;
  return { value: text.slice(start, i), end: i, quoted: false, object: false };
}

const CUBIC_REASON = 'eğri sabit yazılmış (cubic-bezier); --motion-easing-* kullanın';
const STEPS_REASON = 'steps() eğrisi normal profilde yasaktır';
const DURATION_REASON = 'süre sabit yazılmış; --motion-duration-* kullanın';
const NUMBER_REASON = 'süre sabit sayı olarak yazılmış (JS); motion tokenlarını kullanın';
const keywordReason = (word) =>
  `eğri anahtar sözcüğü yasaktır (${word}); --motion-easing-* kullanın`;

/** Seçenek nesnesi ya da `animate(...)` argümanları için nedenler. */
function reasonsForOptions(value) {
  const reasons = [];
  if (/cubic-bezier\s*\(/.test(value)) reasons.push(CUBIC_REASON);
  if (/\bsteps\s*\(\s*\d/.test(value)) reasons.push(STEPS_REASON);
  if (DURATION_RE.test(value)) reasons.push(DURATION_REASON);
  else if (OPTION_NUMBER_RE.test(value) || /,\s*(?:\d+(?:\.\d+)?|\.\d+)\s*\)?\s*$/.test(value)) {
    reasons.push(NUMBER_REASON);
  }
  const keyword = value.match(OPTION_KEYWORD_RE);
  if (keyword) reasons.push(keywordReason(keyword[1]));
  return reasons;
}

function reasonsFor({ value, suffix, quoted, object }) {
  if (object) return reasonsForOptions(value);
  const reasons = [];
  if (/cubic-bezier\s*\(/.test(value)) reasons.push(CUBIC_REASON);
  if (/\bsteps\s*\(\s*\d/.test(value)) reasons.push(STEPS_REASON);
  if (DURATION_RE.test(value)) {
    reasons.push(DURATION_REASON);
  } else if (
    !quoted &&
    /^(Duration|Delay)$/.test(suffix ?? '') &&
    NUMBER_ONLY_RE.test(value.trim())
  ) {
    reasons.push(NUMBER_REASON);
  }
  const keyword = value.match(KEYWORD_RE);
  if (keyword) reasons.push(keywordReason(keyword[1]));
  return reasons;
}

/**
 * İzin yorumunu uygular. Geçerli yorum ve gerçek ihlal: bildirim susturulur (null döner).
 * Eksik sahip ya da neden: ihlal listesine eklenir. İhlalsiz bildirimde izin: gereksiz sayılır.
 */
function applyAllow(text, reasons) {
  const allow = text.match(ALLOW_RE);
  if (!allow) return reasons;
  const owner = allow[1];
  const why = (allow[2] ?? '').trim();
  if (!owner || why.length < ALLOW_MIN_REASON) {
    return [
      ...reasons,
      `motion-gate: allow yorumu sahip=<iş> ve neden=<en az ${ALLOW_MIN_REASON} karakter> ister`,
    ];
  }
  if (reasons.length === 0) return ['motion-gate: allow yorumu gereksiz: bildirimde ihlal yok'];
  return null;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

/** Metindeki ihlalleri döner: { file, line, reason, text }. Her bildirim için en çok bir kayıt. */
export function findMotionViolations(text, file) {
  if (isMotionExempt(file)) return [];
  const isJs = /\.[cm]?[jt]sx?$/.test(file);
  const out = [];
  const covered = [];
  const clean = text.replace(/\r\n/g, '\n');
  const record = (start, end, reasons) => {
    covered.push([start, end]);
    const declaration = clean.slice(start, end);
    const final = applyAllow(declaration, reasons);
    if (!final || final.length === 0) return;
    out.push({
      file,
      line: lineAt(clean, start),
      reason: final.join('; '),
      text: declaration.replace(/\s+/g, ' ').trim(),
    });
  };
  for (const match of clean.matchAll(DECLARATION_START)) {
    const [, , suffix] = match;
    const read = readValue(clean, match.index + match[0].length, isJs);
    record(match.index, read.end, reasonsFor({ ...read, suffix }));
  }
  for (const match of clean.matchAll(ANIMATE_CALL)) {
    const open = match.index + match[0].length - 1;
    const end = skipBalanced(clean, open);
    record(match.index, end, reasonsForOptions(clean.slice(open + 1, end - 1)));
  }
  // Bildirim dışındaki steps(...) ve cubic-bezier(...) çağrıları da yasaktır.
  const isCovered = (index) => covered.some(([s, e]) => index >= s && index < e);
  let offset = 0;
  for (const line of clean.split('\n')) {
    const start = offset;
    offset += line.length + 1;
    if (isCovered(start) || isCovered(start + line.length - 1)) continue;
    const reasons = [];
    if (/cubic-bezier\s*\(/.test(line)) reasons.push(CUBIC_REASON);
    else if (/\bsteps\s*\(\s*\d/.test(line)) reasons.push(STEPS_REASON);
    if (reasons.length === 0 && !ALLOW_RE.test(line)) continue;
    record(start, start + line.length, reasons);
  }
  return out.sort((a, b) => a.line - b.line);
}

function walk(dir, root, acc) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, root, acc);
    else if (SCAN_EXT.has(name.slice(name.lastIndexOf('.')))) acc.push(relative(root, full));
  }
  return acc;
}

/** Geçici izin listesi: scripts/motion-gate.allow.json. Her kayıt dosya, sahip ve neden taşır. */
export function readAllowList(
  file = join(dirname(fileURLToPath(import.meta.url)), 'motion-gate.allow.json'),
) {
  if (!existsSync(file)) return new Map();
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const out = new Map();
  for (const item of data.izinler ?? []) {
    if (!item.dosya || !item.sahip || !item.neden) {
      throw new Error(
        `İzin kaydı eksik: dosya, sahip ve neden zorunludur: ${JSON.stringify(item)}`,
      );
    }
    out.set(item.dosya, item);
  }
  return out;
}

export function scanProject(root = process.cwd(), allow = readAllowList()) {
  const files = walk(join(root, 'src'), root, []);
  const violations = files.flatMap((f) =>
    findMotionViolations(readFileSync(join(root, f), 'utf8'), f),
  );
  const allowed = violations.filter((v) => allow.has(v.file));
  return { violations: violations.filter((v) => !allow.has(v.file)), allowed };
}

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split(sep).join('/').replace(/^.*\//, ''));
if (isMain) {
  const root = process.argv[2] ?? process.cwd();
  const { violations, allowed } = scanProject(root);
  if (allowed.length) {
    const files = [...new Set(allowed.map((v) => v.file))];
    console.log(
      `Hareket kapısı: ${files.length} dosya geçici izinli (scripts/motion-gate.allow.json): ${files.join(', ')}`,
    );
  }
  if (violations.length) {
    console.error(`Hareket kapısı: ${violations.length} ihlal.`);
    for (const v of violations)
      console.error(`  ${v.file}:${v.line}  ${v.reason}\n      ${v.text}`);
    process.exit(1);
  }
  console.log('Hareket kapısı: ihlal yok.');
}
