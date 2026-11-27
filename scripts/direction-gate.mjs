#!/usr/bin/env node
/**
 * Direction gate (IC-14, AJA-1364). Fails if new CSS uses a physical direction property.
 * New CSS uses logical properties. Example: `margin-inline-start` instead of `margin-left`,
 * `inset-inline-start` instead of `left`, `text-align: start` instead of `text-align: left`.
 * Then the layout turns by itself when `<html dir="rtl">`.
 *
 * What is caught:
 * - In every scanned file: `margin-left`, `padding-right`, `scroll-margin-left`, `border-left(-width|-style|-color)`,
 *   `border-top-left-radius` and similar; `text-align`, `float` and `clear` with `left` or `right`.
 *   In a `.ts` file this also covers CSS written inside a string.
 * - Only in `.css` and `.html` files: the `left:` and `right:` properties. In TS code these names are
 *   usually geometry (`{ left: 0, right: 10 }`), so the gate does not read them there.
 * - Only in `.ts`/`.tsx`/`.js`/`.jsx` files: style object keys such as `marginLeft`, `paddingRight`,
 *   `borderLeftWidth` and `textAlign: 'left'`.
 *
 * Existing rules are on the allow list `scripts/direction-gate.allow.json`. Each record holds the file,
 * the exact declaration and how many times it occurs. A new physical rule fails even in an allowed file.
 * When an owner moves a rule to a logical property, the record is removed from the list.
 *
 * Usage: node scripts/direction-gate.mjs [root]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const CSS_EXT = new Set(['.css', '.html']);
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

/** Exempt paths: tests, browser tests, the GILT test tool, design source and scripts. */
export function isDirectionExempt(file) {
  const f = file.split(sep).join('/');
  return (
    f.startsWith('design/') ||
    f.startsWith('tests/') ||
    f.startsWith('scripts/') ||
    f.startsWith('src/testing/') ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(f) ||
    /\/e2e\//.test(f)
  );
}

/** CSS property names written with a hyphen. Valid in CSS files and in CSS strings. */
const CSS_PHYSICAL =
  /(?<![-\w])((?:scroll-)?(?:margin|padding)-(?:left|right)|border-(?:left|right)(?:-(?:width|style|color))?|border-(?:top|bottom)-(?:left|right)-radius)\s*:/g;
/** `text-align`, `float` and `clear` with a physical value. */
const CSS_PHYSICAL_VALUE = /(?<![-\w])(text-align|float|clear)\s*:\s*(?:left|right)(?![-\w])/g;
/** `left:` and `right:` as CSS properties. Only in CSS files. */
const CSS_OFFSET = /(?<![-\w.$])(left|right)\s*:(?!:)/g;
/** Style object keys in JS. Example: `marginLeft: 4`, `'paddingRight': 0`. */
const JS_PHYSICAL =
  /(?<![\w.$])['"]?((?:scroll)?(?:margin|padding)(?:Left|Right)|border(?:Left|Right)(?:Width|Style|Color)?|border(?:Top|Bottom)(?:Left|Right)Radius)['"]?\s*:/g;
/** `textAlign`, `float` and `clear` with a physical value in JS. */
const JS_PHYSICAL_VALUE =
  /(?<![\w.$])['"]?(textAlign|float|cssFloat|clear)['"]?\s*:\s*['"`](?:left|right)['"`]/g;

const REASON =
  'Fiziksel yön özelliği. Mantıksal özelliği kullanın: margin-inline-start, inset-inline-start, text-align: start.';

/** Replaces comments with spaces. Line numbers stay the same. */
function stripComments(text, isCss) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (!isCss) out = out.replace(/(^|[^:\\'"`])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(1)));
  out = out.replace(/<!--[\s\S]*?-->/g, blank);
  return out;
}

function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** The declaration from the property start to `;`, `}`, `,` (JS) or the line end. */
function declarationAt(text, start, isCss) {
  const stop = isCss ? /[;}\n]/ : /[;},\n]/;
  let end = start;
  while (end < text.length && !stop.test(text[end])) end += 1;
  return text
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .replace(/^['"]([\w-]+)['"]/, '$1')
    .trim();
}

/** Returns the physical direction declarations of one file. */
export function findDirectionViolations(source, file) {
  if (isDirectionExempt(file)) return [];
  const ext = file.slice(file.lastIndexOf('.'));
  const isCss = CSS_EXT.has(ext);
  const text = stripComments(source, isCss);
  const patterns = isCss
    ? [CSS_PHYSICAL, CSS_PHYSICAL_VALUE, CSS_OFFSET]
    : [CSS_PHYSICAL, CSS_PHYSICAL_VALUE, JS_PHYSICAL, JS_PHYSICAL_VALUE];
  const seen = new Set();
  const out = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (seen.has(match.index)) continue;
      seen.add(match.index);
      out.push({
        file,
        line: lineAt(text, match.index),
        index: match.index,
        reason: REASON,
        text: declarationAt(text, match.index, isCss),
      });
    }
  }
  out.sort((a, b) => a.index - b.index);
  for (const v of out) delete v.index;
  return out;
}

/**
 * Splits violations into allowed and not allowed. `allow` maps a file to
 * `[{ bildirim, adet }]` records. Each record allows `adet` declarations with the exact text.
 */
export function applyAllowList(violations, allow) {
  const left = new Map();
  for (const [file, records] of allow) {
    for (const { bildirim, adet = 1 } of records) {
      const key = `${file}\u0000${bildirim}`;
      left.set(key, (left.get(key) ?? 0) + adet);
    }
  }
  const allowed = [];
  const rest = [];
  for (const v of violations) {
    const key = `${v.file}\u0000${v.text}`;
    const count = left.get(key) ?? 0;
    if (count > 0) {
      left.set(key, count - 1);
      allowed.push(v);
    } else rest.push(v);
  }
  return { violations: rest, allowed };
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

/** Allow list: scripts/direction-gate.allow.json. Each record holds file, owner, reason and declarations. */
export function readAllowList(
  file = join(dirname(fileURLToPath(import.meta.url)), 'direction-gate.allow.json'),
) {
  if (!existsSync(file)) return new Map();
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const out = new Map();
  for (const item of data.izinler ?? []) {
    if (!item.dosya || !item.sahip || !item.neden || !Array.isArray(item.bildirimler)) {
      throw new Error(
        `İzin kaydı eksik: dosya, sahip, neden ve bildirimler zorunludur: ${JSON.stringify(item)}`,
      );
    }
    out.set(item.dosya, item.bildirimler);
  }
  return out;
}

/** Scans `src/` and `index.html`. */
export function scanProject(root = process.cwd(), allow = readAllowList()) {
  const files = walk(join(root, 'src'), root, []);
  if (existsSync(join(root, 'index.html'))) files.push('index.html');
  const all = files
    .map((f) => f.split(sep).join('/'))
    .flatMap((f) => findDirectionViolations(readFileSync(join(root, f), 'utf8'), f));
  return applyAllowList(all, allow);
}

const isMain =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].split(sep).join('/').replace(/^.*\//, ''));
if (isMain) {
  const root = process.argv[2] ?? process.cwd();
  const { violations, allowed } = scanProject(root);
  if (allowed.length) {
    const files = new Set(allowed.map((v) => v.file));
    console.log(
      `Yön kapısı: ${files.size} dosyada ${allowed.length} eski kural izin listesinde (scripts/direction-gate.allow.json).`,
    );
  }
  if (violations.length) {
    console.error(`Yön kapısı: ${violations.length} ihlal.`);
    for (const v of violations)
      console.error(`  ${v.file}:${v.line}  ${v.reason}\n      ${v.text}`);
    process.exit(1);
  }
  console.log('Yön kapısı: ihlal yok.');
}
