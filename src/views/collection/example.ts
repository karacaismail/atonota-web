import fixture from './fixtures/example-collection.json';
import { createDefinition, parsePage } from './model';
import type { CollectionSource } from './types';

/**
 * Temporary contract-shaped fixture. It uses the Meta message envelope and the
 * CollectionPage response validator. Remove this module's in-memory query adapter
 * when api-client exports its contract-backed MSW handlers; keep fixture validation.
 * It is never imported by the production collection entry.
 */
export const exampleMeta = fixture.metadata.message;
export const exampleDefinition = createDefinition(exampleMeta, {
  label: 'Örnek işler',
  groupField: 'status',
  startField: 'start_date',
  endField: 'end_date',
  durationField: 'hours',
});
const rows = parsePage(fixture.list).data;
/** Only this example source performs local queries. API adapters must send the entire request to the server. */
export const exampleSource: CollectionSource = {
  kind: 'example',
  async list(request, signal) {
    await Promise.resolve();
    signal.throwIfAborted();
    if (request.doctype !== exampleDefinition.doctype) throw new Error('Unknown example DocType');
    let data = rows.filter((row) =>
      request.filters.every(([field, operator, value]) => {
        if (operator === '=') return String(row[field]) === value;
        const search = value
          .slice(1, -1)
          .replace(/\\([\\%_])/g, '$1')
          .toLocaleLowerCase('tr');
        return String(row[field]).toLocaleLowerCase('tr').includes(search);
      }),
    );
    const [field = 'name', direction] = request.order_by.split(',')[0]?.trim().split(' ') ?? [];
    data = [...data].sort((a, b) => {
      const left = a[field];
      const right = b[field];
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'tr', { numeric: true });
      return (direction === 'desc' ? -order : order) || a.name.localeCompare(b.name);
    });
    const total = data.length;
    return {
      data: data
        .slice(request.limit_start, request.limit_start + request.limit_page_length)
        .map((row) => Object.fromEntries(request.fields.map((key) => [key, row[key] ?? null]))),
      has_next_page: request.limit_start + request.limit_page_length < total,
      total,
    };
  },
};
