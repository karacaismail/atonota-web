// AtonotA Login tanıtım sayfası (G-165). Sayfa oturum istemez ve ayrı parça olarak yüklenir.
// Kurallar: var olan yetenek "Bugün neler var?" bölümündedir. Yapılmamış olan "Yakında" bölümündedir.
// Fiyat yazılmaz (G-166). Dış adrese istek ya da ölçüm betiği yoktur (G-134).
// Metinler `messages.json` dosyasındadır. Ölçüler projenin CSS değişkenlerinden gelir.
import type { ReactNode } from 'react';

import { valueProps, type ValueProp } from './content';
import messages from './messages.json';
import './product.css';

const text = messages.tr;

function ValueList({ items }: { items: readonly ValueProp[] }) {
  return (
    <ul className="product-values">
      {items.map((item) => {
        const value = text.values[item.key];
        return (
          <li key={item.key} data-requirement={item.requirement}>
            <h3 className="product-value-title">{value.title}</h3>
            <p className="product-text">{value.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="product-part" aria-labelledby={id}>
      <h2 id={id} className="product-heading">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ProductPage() {
  const ready = valueProps.filter((item) => item.status === 'ready');
  const soon = valueProps.filter((item) => item.status === 'soon');
  return (
    <main className="product-page" aria-labelledby="product-title">
      <header className="product-part">
        <h1 id="product-title" className="product-heading">
          {text.title}
        </h1>
        <p className="product-text">{text.lead}</p>
        <p className="product-text">{text.lead_more}</p>
      </header>
      <Part id="product-ready" title={text.ready_title}>
        <ValueList items={ready} />
      </Part>
      <Part id="product-soon" title={text.soon_title}>
        <p className="product-text">{text.soon_intro}</p>
        <ValueList items={soon} />
      </Part>
      <Part id="product-pricing" title={text.pricing_title}>
        <p className="product-text">{text.pricing_body}</p>
        <p className="product-text">{text.pricing_more}</p>
      </Part>
      <Part id="product-license" title={text.license_title}>
        <p className="product-text">{text.license_product}</p>
        <p className="product-text">{text.license_keycloak}</p>
      </Part>
      <p className="product-text">
        {/* Panelin ana sayfası: canlıda `/panel/`, yerelde `/`. */}
        <a href={import.meta.env.BASE_URL}>{text.cta}</a>
      </p>
    </main>
  );
}
