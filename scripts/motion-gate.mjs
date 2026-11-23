#!/usr/bin/env node
/**
 * Hareket kapısı. `src/design/` dışında sabit süre, `cubic-bezier(...)`, `steps(...)` ya da
 * `ease`, `ease-in`, `ease-out`, `ease-in-out`, `linear` anahtar sözcüğü yazılırsa başarısız olur.
 * Bütün süre ve eğriler `src/design/motion.ts` içindedir; bileşenler CSS değişkenlerini ya da
 * tokenları kullanır.
 *
 * Kapı metni satır satır değil, bildirim bildirim tarar. Bildirim `transition` ya da `animation`
 * ile başlar ve noktalı virgüle (CSS) ya da metin değerinin sonuna (JS) kadar sürer. Prettier'in
 * birden çok satıra böldüğü değerler de böylece yakalanır.
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
 * Bildirim başlangıcı: CSS (`transition-duration:`) ya da JS (`transitionDuration:` / `= `).
 * Grup 1 özellik adı, grup 2 ek (süre, gecikme, eğri), grup 3 ayraç.
 */
const DECLARATION_START =
  /(?<![-\w])(transition|animation)(-duration|-delay|-timing-function|Duration|Delay|TimingFunction)?\s*([:=])\s*/g;

const DURATION_RE = /(?<![-\w.])\d+(?:\.\d+)?m?s(?![-\w])/;
const NUMBER_ONLY_RE = /^\d+(?:\.\d+)?\s*(?:[,;)}\]]|$)/;
const KEYWORD_RE = /(?<![-\w])(ease-in-out|ease-in|ease-out|ease|linear)(?![-\w])/;

/** Bildirimin değerini ve bittiği konumu döner. Metin değeri tırnakla sınırlıdır. */
function readValue(text, start) {
  const first = text[start];
  if (first === "'" || first === '"' || first === '`') {
    let i = start + 1;
    while (i < text.length && text[i] !== first) {
      if (text[i] === '\\') i += 1;
      i += 1;
    }
    return { value: text.slice(start + 1, i), end: i + 1, quoted: true };
  }
  let i = start;
  while (i < text.length && !';{}'.includes(text[i])) i += 1;
  return { value: text.slice(start, i), end: i, quoted: false };
}

function reasonsFor(value, suffix, quoted) {
  const reasons = [];
  if (/cubic-bezier\s*\(/.test(value)) {
    reasons.push('eğri sabit yazılmış (cubic-bezier); --motion-easing-* kullanın');
  }
  if (/\bsteps\s*\(\s*\d/.test(value)) {
    reasons.push('steps() eğrisi normal profilde yasaktır');
  }
  if (DURATION_RE.test(value)) {
    reasons.push('süre sabit yazılmış; --motion-duration-* kullanın');
  } else if (
    !quoted &&
    /^(Duration|Delay)$/.test(suffix ?? '') &&
    NUMBER_ONLY_RE.test(value.trim())
  ) {
    reasons.push('süre sabit sayı olarak yazılmış (JS); motion tokenlarını kullanın');
  }
  const keyword = value.match(KEYWORD_RE);
  if (keyword) {
    reasons.push(`eğri anahtar sözcüğü yasaktır (${keyword[1]}); --motion-easing-* kullanın`);
  }
  return reasons;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

/** Metindeki ihlalleri döner: { file, line, reason, text }. Her bildirim için en çok bir kayıt. */
export function findMotionViolations(text, file) {
  if (isMotionExempt(file)) return [];
  const out = [];
  const clean = text.replace(/\r\n/g, '\n');
  for (const match of clean.matchAll(DECLARATION_START)) {
    const [, , suffix] = match;
    const { value, end, quoted } = readValue(clean, match.index + match[0].length);
    const declaration = clean.slice(match.index, end);
    if (/motion-gate:\s*allow/.test(declaration)) continue;
    const reasons = reasonsFor(value, suffix, quoted);
    if (reasons.length === 0) continue;
    out.push({
      file,
      line: lineAt(clean, match.index),
      reason: reasons.join('; '),
      text: declaration.replace(/\s+/g, ' ').trim(),
    });
  }
  // Bildirim dışındaki steps(...) ve cubic-bezier(...) çağrıları da yasaktır.
  const seenLines = new Set(out.map((v) => v.line));
  clean.split('\n').forEach((line, i) => {
    if (seenLines.has(i + 1) || /motion-gate:\s*allow/.test(line)) return;
    if (/cubic-bezier\s*\(/.test(line)) {
      out.push({
        file,
        line: i + 1,
        reason: 'eğri sabit yazılmış (cubic-bezier); --motion-easing-* kullanın',
        text: line.trim(),
      });
    } else if (/\bsteps\s*\(\s*\d/.test(line)) {
      out.push({
        file,
        line: i + 1,
        reason: 'steps() eğrisi normal profilde yasaktır',
        text: line.trim(),
      });
    }
  });
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
