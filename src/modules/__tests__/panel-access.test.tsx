import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import AdministrationPage from '../administration/Page';
import {
  TENANT_ADMIN_ASSISTANT_ROLE,
  moduleAccess,
  moduleRegistrations,
  visibleModules,
} from '../registry';
import { ModuleProvider } from '../runtime';
import SitePlanPage from '../site-plan/Page';

afterEach(cleanup);

const assistant = ['Website User', TENANT_ADMIN_ASSISTANT_ROLE];
const ids = (roles?: readonly string[]) => visibleModules(roles).map((m) => m.id);

function wrap(node: React.ReactNode, roles?: readonly string[]) {
  return (
    <ModuleProvider
      value={{
        tenant: 'example-site',
        user: 'example-user',
        mode: 'example',
        ...(roles ? { roles } : {}),
      }}
    >
      {node}
    </ModuleProvider>
  );
}

describe('G-168: kiracı yöneticisi yardımcısının panel süzgeci', () => {
  it('yardımcı yalnız dört grubu ve Yönetim grubunu görür', () => {
    expect(ids(assistant)).toEqual([
      'account',
      'administration',
      'hr',
      'site-plan',
      'ai-operations',
    ]);
    expect(ids(assistant)).not.toContain('ai-providers');
  });

  it('"Site ve plan" grubu yardımcıya yalnız okunur', () => {
    expect(moduleAccess('site-plan', assistant)).toEqual({ kind: 'read' });
  });

  it('"Yönetim" grubunda yardımcı yalnız kullanıcı listesini görür', () => {
    expect(moduleAccess('administration', assistant)).toEqual({
      kind: 'sections',
      sections: ['users'],
    });
  });

  it('yardımcı bilinmeyen bir modülü görmez', () => {
    expect(moduleAccess('billing', assistant)).toBeNull();
  });

  it('kiracı yöneticisi ve sistem yöneticisi bütün grupları görür', () => {
    for (const elevated of ['Tenant Admin', 'System Manager']) {
      const roles = [...assistant, elevated];
      expect(ids(roles)).toEqual(moduleRegistrations.map((m) => m.id));
      expect(moduleAccess('site-plan', roles)).toEqual({ kind: 'full' });
    }
  });

  it('rol bilgisi yoksa süzgeç bugünkü menüyü değiştirmez', () => {
    expect(ids(undefined)).toEqual(moduleRegistrations.map((m) => m.id));
    expect(ids(['Employee'])).toEqual(moduleRegistrations.map((m) => m.id));
  });

  it('Yönetim sayfası yardımcıya yalnız kullanıcılar bölümünü gösterir', () => {
    render(wrap(<AdministrationPage />, assistant));
    expect(screen.getByRole('heading', { name: 'Kullanıcılar' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Roller' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Erişimi açıkla' })).toBeNull();
  });

  it('Yönetim sayfası öteki kişilere bütün bölümleri gösterir', () => {
    render(wrap(<AdministrationPage />, ['Tenant Admin']));
    expect(screen.getByRole('heading', { name: 'Roller' })).toBeTruthy();
  });

  it('Site ve plan sayfası yardımcıya yalnız okuma notunu gösterir', () => {
    render(wrap(<SitePlanPage />, assistant));
    expect(
      screen.getByText('Bu bölümü yalnız okuyabilirsiniz. Planı değiştiremezsiniz.'),
    ).toBeTruthy();
  });

  it('Site ve plan sayfası öteki kişilere yalnız okuma notunu göstermez', () => {
    render(wrap(<SitePlanPage />, ['Tenant Admin']));
    expect(
      screen.queryByText('Bu bölümü yalnız okuyabilirsiniz. Planı değiştiremezsiniz.'),
    ).toBeNull();
  });
});
