import { ThoughtChain } from '@ant-design/x';
import { Brain, Paperclip, ShieldCheck } from '@phosphor-icons/react';
import { Tag } from 'antd';

import type { AgentSource, AgentStep } from '../agent';
import { toChainItems } from './chain';

/**
 * Sağdaki çalışma alanı: düşünce zinciri, bağlam ve güvenlik.
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
          <Brain className="ai-brain" aria-hidden />
          Düşünce adımları
        </h2>
        {steps.length > 0 ? (
          <ThoughtChain size="small" items={toChainItems(steps)} />
        ) : (
          <p className="ai-note">Henüz adım yok. Adımları yalnız sunucu gönderir.</p>
        )}
      </section>
      <section>
        <h2 className="ai-panel-h">
          <Paperclip aria-hidden />
          Bağlam dosyaları
        </h2>
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
