import { useGenuiStrings } from '../useGenuiStrings';

/**
 * Safe JSON view (U2). An unknown block is never drawn as HTML.
 * Content is rendered only as a text node.
 */
export function JsonView({ raw }: { raw: unknown }) {
  const strings = useGenuiStrings();
  let text: string;
  try {
    text = JSON.stringify(raw, null, 2) ?? String(raw);
  } catch {
    text = String(raw);
  }
  return (
    <section data-genui="json" className="genui-card genui-json">
      <span className="genui-muted-text">{strings.unknownBlock}</span>
      <pre>{text}</pre>
    </section>
  );
}
