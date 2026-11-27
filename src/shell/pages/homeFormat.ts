import type { HomeProblem, PendingApproval, RecentChange } from '@/api';
import type { Formatter } from '@/app/locale';

import { t } from '../messages';

const m = t.home;

/** `YYYY-MM-DD` değerini gün adıyla, kullanıcının diliyle yazar. Okunamayan değer olduğu gibi döner. */
export function formatDay(value: string, format: Formatter): string {
  return format.date(value);
}

/**
 * Sunucu zamanını yazar: "22 Kasım 2026 Pazar günü, saat 09:05."
 * Frappe değeri sitenin saat dilimiyle okunur. Saat yine sitenin saat diliminde yazılır (IC-13).
 * Saat okunamazsa yalnız gün yazılır. Kabuk saat uydurmaz.
 */
export function formatMoment(value: string, format: Formatter): string {
  const day = formatDay(value, format);
  const instant = format.parseFrappeDatetime(value);
  return instant ? m.moment(day, format.time(instant)) : m.single(day);
}

/** Talebin sahibi ve türü. Örnek: "Örnek Kişi 3: Örnek Yıllık İzin". */
export function pendingWho(item: PendingApproval): string {
  return m.who(item.employee_name ?? item.name, item.leave_type ?? m.leaveFallback);
}

/** Talebin tarihleri, gün sayısı ve kalan izni. Eksik bilgi yazılmaz, uydurulmaz. */
export function pendingMeta(item: PendingApproval, format: Formatter): string {
  const parts: string[] = [];
  const { from_date: from, to_date: to } = item;
  if (from && to && from !== to)
    parts.push(m.range(formatDay(from, format), formatDay(to, format)));
  else if (from) parts.push(m.single(formatDay(from, format)));
  if (item.total_leave_days !== null) parts.push(m.days(format.number(item.total_leave_days)));
  if (item.leave_balance !== null) parts.push(m.balance(format.number(item.leave_balance)));
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
