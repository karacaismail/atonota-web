import { describe, expect, it } from 'vitest';
import { buildShellNav, groupNavigation, navFromSidebars } from './nav';
import type { NavEntry } from './sampleData';

const links = (entries: NavEntry[]) =>
  entries.flatMap((entry) => (entry.kind === 'link' ? [entry] : entry.children));

describe('task navigation groups', () => {
  it('groups permitted work under the three approved headings', () => {
    const sections = groupNavigation(buildShellNav([], new Set(['Leave Application'])));
    expect(sections.map((section) => section.label)).toEqual([
      'Bakmak ve onaylamak',
      'İnsan kaynakları',
      'Yönetim',
    ]);
    expect(sections[1]?.children.map((link) => link.to)).toEqual(['/hr']);
  });

  it('keeps each page once, including the dedicated leave page and its generic list', () => {
    const groups = navFromSidebars([
      {
        id: 'hr',
        label: 'İK',
        module: 'hr',
        links: [
          { label: 'İzinler', doctype: 'Leave Application' },
          { label: 'Çalışanlar', doctype: 'Employee' },
        ],
      },
    ]);
    const entries = buildShellNav(groups, new Set(['Leave Application', 'Employee']));
    const result = groupNavigation([...entries, ...entries]).flatMap((group) => group.children);
    expect(result.map((link) => link.to)).toHaveLength(new Set(result.map((link) => link.to)).size);
    expect(result.filter((link) => link.requires?.includes('Leave Application'))).toHaveLength(1);
    expect(result.some((link) => link.requires?.includes('Employee'))).toBe(true);
  });

  it('does not restore denied pages and removes their empty heading', () => {
    const entries = buildShellNav([], new Set());
    const sections = groupNavigation(entries);
    expect(sections.map((section) => section.label)).not.toContain('İnsan kaynakları');
    expect(
      sections
        .flatMap((section) => section.children)
        .map((link) => link.to)
        .sort(),
    ).toEqual(
      links(entries)
        .map((link) => link.to)
        .sort(),
    );
    expect(sections.flatMap((section) => section.children).some((link) => link.to === '/hr')).toBe(
      false,
    );
    expect(groupNavigation([])).toEqual([]);
  });

  it('retains the generic list when its dedicated page is unavailable', () => {
    const groups = navFromSidebars([
      {
        id: 'hr',
        label: 'İK',
        module: 'hr',
        links: [{ label: 'İzinler', doctype: 'Leave Application' }],
      },
    ]);
    expect(groupNavigation(groups).flatMap((group) => group.children)).toHaveLength(1);
  });

  it('preserves a different task that happens to require the same DocType', () => {
    const leave = links(buildShellNav([], new Set(['Leave Application']))).find(
      (link) => link.to === '/hr',
    );
    expect(leave).toBeDefined();
    if (!leave) return;
    const sections = groupNavigation([leave, { ...leave, id: 'leave-history', to: '/hr/history' }]);
    expect(sections.flatMap((group) => group.children).map((link) => link.to)).toEqual([
      '/hr',
      '/hr/history',
    ]);
  });
});
