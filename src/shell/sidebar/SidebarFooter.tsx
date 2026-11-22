import { t } from '../messages';
import { sampleCredit, sampleUser } from '../sampleData';

interface SidebarFooterProps {
  rail: boolean;
}

/** B1: AI kredisi ve kullanıcı. Sidebar'ın en koyu yüzeyidir. */
export function SidebarFooter({ rail }: SidebarFooterProps) {
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
          {sampleUser.initials}
        </span>
        {rail ? (
          <span className="shell-vh">{sampleUser.name}</span>
        ) : (
          <span className="shell-ws-t">
            <b>{sampleUser.name}</b>
            <small>{sampleUser.role}</small>
          </span>
        )}
      </div>
    </div>
  );
}
