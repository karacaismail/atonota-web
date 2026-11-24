// @vitest-environment node
// CI tarayıcı kurulum betiğinin testleri (.github/actions/playwright-browsers/install.sh).
//
// Sorun: bir ağ denemesi süre sınırına takıldı. İçteki `apt-get` çalışmayı sürdürdü ve
// dpkg kilidini tuttu. Sonraki denemeler hemen düştü. Bu testler betiğin ağ döngüsünü
// yavaş bir sahte `npx` ile koşar. Sahte `npx`, `apt-get` adlı bir alt süreci kendi
// oturumunda başlatır. `sudo` komutu pty ile böyle yapar. Bu yüzden yalnız süreç grubunu
// durdurmak o süreci durdurmaz.
//
// Kaynak: frappesetup deposundaki aynı betiğin Python testi.
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPT = join(ROOT, '.github', 'actions', 'playwright-browsers', 'install.sh');
const TEST_TIMEOUT_MS = 90_000;

// Sahte `npx playwright install-deps`: 1. çağrı takılır, sonraki çağrılar başarılı olur.
const FAKE_NPX = `#!/usr/bin/env bash
set -u
n=$(($(cat "$WORK/calls" 2>/dev/null || echo 0) + 1))
echo "$n" > "$WORK/calls"
if [ "$n" -gt 1 ]; then
  # 1. denemenin süreçleri bu anda yaşıyor muydu? Kayda yazılır.
  for f in "$WORK"/pid.*; do
    if kill -0 "$(cat "$f")" 2>/dev/null; then echo alive; else echo dead; fi
  done > "$WORK/seen-by-retry"
  exit 0
fi
# Kendi oturumunda apt-get adlı alt süreç (süreç grubunu durdurmak ona ulaşmaz).
perl -e 'use POSIX qw(setsid); setsid(); exec { "/bin/sleep" } "apt-get", "300"' \\
  </dev/null >/dev/null 2>&1 &
echo $! > "$WORK/pid.apt"
# Denemenin süreç grubundaki sıradan alt süreç.
sleep 300 </dev/null >/dev/null 2>&1 &
echo $! > "$WORK/pid.group"
wait
`;

interface LoopOptions {
  extra?: string;
  attempts?: number;
  seconds?: number;
  lockWait?: number;
}

const workDirs: string[] = [];

afterEach(() => {
  for (const work of workDirs.splice(0)) {
    for (const pid of Object.values(pids(work))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Süreç zaten durmuş.
      }
    }
    rmSync(work, { recursive: true, force: true });
  }
});

function makeWork(): string {
  const work = mkdtempSync(join(tmpdir(), 'pw-install-'));
  workDirs.push(work);
  mkdirSync(join(work, 'bin'));
  const npx = join(work, 'bin', 'npx');
  writeFileSync(npx, FAKE_NPX);
  chmodSync(npx, 0o755);
  return work;
}

function runLoop(
  work: string,
  { extra = '', attempts = 2, seconds = 2, lockWait = 10 }: LoopOptions = {},
) {
  // sudo komutu aynı kullanıcıyla çalıştırır ve kayda yazar. dpkg gerçekten hiç çalışmaz.
  const harness = `
sudo() {
  echo "sudo $*" >> "$WORK/sudo.log"
  case "$1" in dpkg|tee) return 0 ;; esac
  "$@"
}
source "${SCRIPT}"
ARCHIVES="$WORK/archives"; DEBS="$WORK/debs"; MIRRORS="$WORK/no-mirrors"
APT_LOCK_FILES="$WORK/no-lock"
mkdir -p "$ARCHIVES"
list_archives() { :; }
NET_ATTEMPTS=${attempts}
NET_ATTEMPT_SECONDS=${seconds}
${extra}
before=$(mktemp)
install_from_network "$before"
`;
  const script = join(work, 'harness.sh');
  writeFileSync(script, harness);
  const start = Date.now();
  const proc = spawnSync('bash', [script], {
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      PATH: `${join(work, 'bin')}:/usr/bin:/bin:/usr/sbin:/sbin`,
      HOME: work,
      WORK: work,
      PW_APT_KILL_AFTER_SECONDS: '2',
      PW_APT_LOCK_WAIT_SECONDS: String(lockWait),
      PW_DPKG_CONFIGURE_SECONDS: '2',
      PW_BROWSERS: 'chromium',
    },
  });
  const elapsedSeconds = (Date.now() - start) / 1000;
  return { proc, elapsedSeconds, out: `${proc.stdout}${proc.stderr}` };
}

function pids(work: string): Record<string, number> {
  if (!existsSync(work)) return {};
  const result: Record<string, number> = {};
  for (const name of readdirSync(work)) {
    if (!name.startsWith('pid.')) continue;
    const pid = Number(readFileSync(join(work, name), 'utf8').trim());
    if (Number.isInteger(pid) && pid > 0) result[name] = pid;
  }
  return result;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function calls(work: string): string {
  return readFileSync(join(work, 'calls'), 'utf8').trim();
}

describe('CI tarayıcı kurulum betiği', () => {
  it(
    'süre dolunca alt süreçleri durdurur ve yeni deneme onları bekler',
    () => {
      const work = makeWork();
      const { proc, elapsedSeconds, out } = runLoop(work);
      expect(proc.status, out).toBe(0);
      expect(calls(work), out).toBe('2');
      const found = pids(work);
      expect(Object.keys(found).sort(), out).toEqual(['pid.apt', 'pid.group']);
      // Yeni deneme, 1. denemenin bütün süreçleri durduktan sonra başladı.
      expect(
        readFileSync(join(work, 'seen-by-retry'), 'utf8').split(/\s+/).filter(Boolean),
        out,
      ).toEqual(['dead', 'dead']);
      for (const [name, pid] of Object.entries(found)) {
        expect(alive(pid), `${name} (${pid}) hâlâ çalışıyor\n${out}`).toBe(false);
      }
      expect(readFileSync(join(work, 'sudo.log'), 'utf8'), out).toContain(
        'sudo dpkg --configure -a',
      );
      expect(elapsedSeconds, out).toBeLessThan(60);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'kilit beklemesinin kendi süre sınırı vardır',
    () => {
      // Kilit hiç bırakılmaz. Döngü yeniden denemek yerine vazgeçmeli.
      const work = makeWork();
      const { proc, elapsedSeconds, out } = runLoop(work, {
        extra: 'apt_busy() { return 0; }',
        lockWait: 2,
      });
      expect(proc.status, out).not.toBe(0);
      expect(calls(work), out).toBe('1');
      expect(elapsedSeconds, out).toBeLessThan(60);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'süre dolunca betiğin başlatmadığı apt süreçlerine dokunmaz',
    () => {
      // Betiğin başlatmadığı, kendi oturumunda çalışan bir apt-get süreci.
      const bystander = `
perl -e 'use POSIX qw(setsid); setsid(); exec { "/bin/sleep" } "apt-get", "300"' \\
  </dev/null >/dev/null 2>&1 &
echo $! > "$WORK/pid.bystander"
# Kilit beklemesi ayrı denenir. Burada kilit hemen boştur.
apt_busy() { return 1; }
`;
      const work = makeWork();
      const { proc, elapsedSeconds, out } = runLoop(work, { extra: bystander });
      expect(proc.status, out).toBe(0);
      const found = pids(work);
      expect(Object.keys(found).sort(), out).toEqual(['pid.apt', 'pid.bystander', 'pid.group']);
      // Betiğin kendi süreçleri durdu. Yabancı süreç çalışmayı sürdürüyor.
      expect(alive(found['pid.apt']!), out).toBe(false);
      expect(alive(found['pid.group']!), out).toBe(false);
      expect(alive(found['pid.bystander']!), out).toBe(true);
      // Hiçbir süreç ad deseniyle durdurulmaz.
      expect(readFileSync(join(work, 'sudo.log'), 'utf8'), out).not.toContain('pkill');
      expect(elapsedSeconds, out).toBeLessThan(60);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'dpkg --configure -a komutunun süre sınırı vardır',
    () => {
      // `dpkg --configure -a` takılır. Döngü komutu durdurmalı ve açık hatayla düşmeli.
      const hang = `
sudo() {
  echo "sudo $*" >> "$WORK/sudo.log"
  case "$1" in
    dpkg) sleep 300 ;;
    tee) return 0 ;;
    *) "$@" ;;
  esac
}
`;
      const work = makeWork();
      const { proc, elapsedSeconds, out } = runLoop(work, { extra: hang });
      expect(proc.status, out).not.toBe(0);
      expect(calls(work), out).toBe('1');
      expect(proc.stderr, out).toContain('dpkg --configure -a 2 sn içinde bitmedi');
      expect(elapsedSeconds, out).toBeLessThan(60);
    },
    TEST_TIMEOUT_MS,
  );
});
