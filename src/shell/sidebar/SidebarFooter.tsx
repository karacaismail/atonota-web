import { t } from '../messages';
import { sampleCredit, sampleUser } from '../sampleData';
import type { ShellAccount } from '../view-data';
import { useViewData } from '../view-data';

interface SidebarFooterProps {
  rail: boolean;
}

/** Adın ilk iki sözcüğünün baş harfleri. Örnek: "Deneme Kullanıcı" -> "DK". */
function initialsOf(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, name.includes(' ') ? 2 : 1)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr'))
    .join('');
}

/** Oturumdaki kişi varsa onu, yoksa deneme sayfasının örnek kişisini gösterir. */
function cardUser(account: ShellAccount | undefined) {
  if (!account) return sampleUser;
  const name = account.fullName?.trim() || account.user;
  // Ad varsa kimlik alt satırda görünür. Ad yoksa kimlik bir kez yazılır.
  return { name, role: name === account.user ? '' : account.user, initials: initialsOf(name) };
}

/** B1: AI kredisi ve kullanıcı. Sidebar'ın en koyu yüzeyidir. */
export function SidebarFooter({ rail }: SidebarFooterProps) {
  const user = cardUser(useViewData()?.account);
  const percent = Math.round((sampleCredit.used / sampleCredit.total) * 100);
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="shell-foot" data-rail={rail ? 'true' : 'false'}>
      <div className="shell-ring">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          role="img"
          aria-label={t.footer.creditRing(percent)}
        >
          <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="shell-ring-track" />
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="shell-ring-value"
            strokeDasharray={`${(c * percent) / 100} ${c}`}
            transform="rotate(-90 18 18)"
          />
        </svg>
        {!rail && (
          <span className="shell-ws-t">
            <b>{t.footer.credit}</b>
            <small>{t.footer.creditValue(sampleCredit.used, sampleCredit.total)}</small>
          </span>
        )}
      </div>
      <div className="shell-user">
        <span className="shell-av" aria-hidden="true">
          {user.initials}
        </span>
        {rail ? (
          <span className="shell-vh">{user.name}</span>
        ) : (
          <span className="shell-ws-t">
            <b>{user.name}</b>
            <small>{user.role}</small>
          </span>
        )}
      </div>
    </div>
  );
}
