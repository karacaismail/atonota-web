import type { HomeProblem, PendingApproval, RecentChange } from '@/api';

import { t } from '../messages';

const m = t.home;

/** Tarih "8 Aralık 2026 Salı" biçiminde yazılır. Saat dilimi kaymasın diye UTC okunur. */
const dayFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
  timeZone: 'UTC',
});

const DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME = /[ T](\d{2}):(\d{2})/;

/** `YYYY-MM-DD` değerini gün adıyla yazar. Okunamayan değer olduğu gibi döner. */
export function formatDay(value: string): string {
  const match = DATE.exec(value);
  if (!match) return value;
  const [, y, mo, d] = match;
  return dayFormat.format(new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))));
}

/**
 * Sunucu zamanını yazar: "22 Kasım 2026 Pazar günü, saat 09.05."
 * Saat sunucunun yazdığı saattir. Kabuk saati çevirmez ve uydurmaz.
 */
export function formatMoment(value: string): string {
  const day = formatDay(value);
  const time = TIME.exec(value);
  return time ? `${day} günü, saat ${time[1]}.${time[2]}.` : `${day} günü.`;
}

/** Talebin sahibi ve türü. Örnek: "Örnek Kişi 3: Örnek Yıllık İzin". */
export function pendingWho(item: PendingApproval): string {
  return m.who(item.employee_name ?? item.name, item.leave_type ?? m.leaveFallback);
}

/** Talebin tarihleri, gün sayısı ve kalan izni. Eksik bilgi yazılmaz, uydurulmaz. */
export function pendingMeta(item: PendingApproval): string {
  const parts: string[] = [];
  const { from_date: from, to_date: to } = item;
  if (from && to && from !== to) parts.push(m.range(formatDay(from), formatDay(to)));
  else if (from) parts.push(m.single(formatDay(from)));
  if (item.total_leave_days !== null) parts.push(m.days(item.total_leave_days));
  if (item.leave_balance !== null) parts.push(m.balance(item.leave_balance));
  return parts.join(' ');
}

export function problemText(problem: HomeProblem): { tag: string; text: string } {
  if (problem.kind === 'overlap') {
    // Sözleşme iki talep verir. Önce erken başlayan gelir.
    const [a, b] = problem.leaves;
    return {
      tag: m.overlapTag,
      text: m.overlap(problem.department, a?.name ?? '', b?.name ?? ''),
    };
  }
  return {
    tag: m.missingTag,
    text: m.missingJoining(problem.employee_name ?? problem.employee),
  };
}

export function recentText(change: RecentChange): string {
  return m.recent[change.action](change.actor, change.name);
}
