import { ChartBar } from '@phosphor-icons/react';

import type { ChartBlock } from '../types';

export function ChartView({ block }: { block: ChartBlock }) {
  const max = Math.max(...block.bars.map((bar) => bar.value), 1);
  const summary = block.bars.map((bar) => `${bar.label} ${bar.value}`).join(', ');
  return (
    <section data-genui="chart" className="genui-card">
      <header className="genui-card-h">
        <ChartBar aria-hidden />
        <strong>{block.title}</strong>
      </header>
      <div className="genui-bars" role="img" aria-label={`${block.title}: ${summary}`}>
        {block.bars.map((bar) => (
          <div
            key={bar.label}
            className={`genui-bar${bar.value === max ? ' is-top' : ''}`}
            aria-hidden
          >
            <span className="genui-bar-v">{bar.value}</span>
            <i style={{ height: `${(bar.value / max) * 100}%` }} />
            <span className="genui-bar-l">{bar.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
