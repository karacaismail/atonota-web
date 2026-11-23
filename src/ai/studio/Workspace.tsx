import { ThoughtChain } from '@ant-design/x';
import { Paperclip, ShieldCheck, Wrench } from '@phosphor-icons/react';
import { Tag } from 'antd';

import type { AgentSource, AgentStep } from '../agent';
import { SIMULATED_TOOLS_NOTE, toChainItems } from './chain';

export const FILE_NAME_ONLY_NOTE = 'Yalnız dosya adı gönderilir. Dosya içeriği okunmaz.';

/**
 * Sağdaki çalışma alanı: araç işlemleri, bu sohbetin dosya adları ve güvenlik.
 * Kaynak ve mod her zaman görünür (AX-7).
 */
export function Workspace({
  steps,
  files,
  source,
}: {
  steps: AgentStep[];
  files: string[];
  source: AgentSource;
}) {
  return (
    <aside className="ai-workspace" aria-label="Çalışma alanı">
      <section>
        <h2 className="ai-panel-h">
          <Wrench aria-hidden />
          Araç işlemleri
        </h2>
        {steps.length > 0 ? (
          <>
            {source.simulated && <p className="ai-note">{SIMULATED_TOOLS_NOTE}</p>}
            <ThoughtChain size="small" items={toChainItems(steps)} />
          </>
        ) : (
          <p className="ai-note">Henüz araç işlemi yok. Listeyi yalnız sunucu gönderir.</p>
        )}
      </section>
      <section>
        <h2 className="ai-panel-h">
          <Paperclip aria-hidden />
          Bu sohbetin dosya adları
        </h2>
        <p className="ai-note">{FILE_NAME_ONLY_NOTE}</p>
        {files.length > 0 ? (
          <ul className="ai-files">
            {files.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : (
          <p className="ai-note">Dosya eklenmedi.</p>
        )}
      </section>
      <section>
        <h2 className="ai-panel-h">
          <ShieldCheck aria-hidden />
          Güvenlik
        </h2>
        <dl className="ai-facts">
          <dt>Kaynak</dt>
          <dd>
            <Tag bordered={false} color={source.simulated ? 'warning' : 'processing'}>
              {source.label}
            </Tag>
          </dd>
          <dt>Mod</dt>
          <dd>{source.simulated ? 'Deneme. Gerçek işlem yapılmaz.' : 'Canlı'}</dd>
          <dt>Eylemler</dt>
          <dd>Onayınız olmadan hiçbir işlem yapılmaz.</dd>
        </dl>
      </section>
    </aside>
  );
}
