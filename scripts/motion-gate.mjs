#!/usr/bin/env node
/**
 * Hareket kapısı. `src/design/` dışında sabit süre, `cubic-bezier(...)` ya da `steps(...)`
 * yazılırsa başarısız olur. Bütün süre ve eğriler `src/design/motion.ts` içindedir;
 * bileşenler CSS değişkenlerini ya da tokenları kullanır.
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

const PATTERNS = [
  {
    re: /cubic-bezier\s*\(/,
    reason: 'eğri sabit yazılmış (cubic-bezier); --motion-easing-* kullanın',
  },
  { re: /\bsteps\s*\(\s*\d/, reason: 'steps() eğrisi normal profilde yasaktır' },
  {
    re: /(?:^|[^-\w])(?:transition|animation)(?:-duration|-delay)?\s*:\s*[^;{}]*?\b\d+(?:\.\d+)?m?s\b/i,
    reason: 'süre sabit yazılmış; --motion-duration-* kullanın',
  },
  {
    re: /\b(?:transition|animation)(?:Duration|Delay)?\s*[:=]\s*["'`][^"'`]*\b\d+(?:\.\d+)?m?s\b/,
    reason: 'süre sabit yazılmış (JS/TSX); motion tokenlarını kullanın',
  },
];

/** Metindeki ihlalleri döner: { file, line, reason, text }. */
export function findMotionViolations(text, file) {
  if (isMotionExempt(file)) return [];
  const out = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/motion-gate:\s*allow/.test(line)) return;
    for (const { re, reason } of PATTERNS) {
      if (re.test(line)) {
        out.push({ file, line: i + 1, reason, text: line.trim() });
        break;
      }
    }
  });
  return out;
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
  const violations = scanProject(root);
  if (violations.length) {
    console.error(`Hareket kapısı: ${violations.length} ihlal.`);
    for (const v of violations)
      console.error(`  ${v.file}:${v.line}  ${v.reason}\n      ${v.text}`);
    process.exit(1);
  }
  console.log('Hareket kapısı: ihlal yok.');
}
