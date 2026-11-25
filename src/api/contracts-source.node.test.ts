import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Bu test depodaki gerçek sözleşme kopyasını denetler.
// Kopya temiz bir arka uç commit'inden alınmalıdır.
const contracts = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'contracts');

interface Source {
  commit: string;
  dirty: boolean;
  files: { path: string; sha256: string }[];
}

const source = JSON.parse(readFileSync(join(contracts, 'SOURCE.json'), 'utf8')) as Source;

function contract(name: string) {
  return readFileSync(join(contracts, 'openapi', `${name}.openapi.yaml`), 'utf8');
}

describe('sözleşme kopyasının kaynağı', () => {
  it('temiz bir arka uç commit ucundan alınır', () => {
    expect(source.dirty).toBe(false);
    expect(source.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('dosya özetleri SOURCE.json ile aynıdır', () => {
    for (const file of source.files) {
      const hash = createHash('sha256')
        .update(readFileSync(join(contracts, file.path)))
        .digest('hex');
      expect(hash, file.path).toBe(file.sha256);
    }
  });

  // AJA-790: G-62 rol ve yetki uçları.
  it.each([
    '/platform_core.api.access.explain_permission:',
    '/platform_core.api.access.list_role_permissions:',
    '/platform_core.api.access.set_role_permission:',
    '/platform_core.api.access.remove_role_permission:',
  ])('erişim sözleşmesinde %s ucu vardır', (path) => {
    expect(contract('platform_core-access')).toContain(path);
  });

  // AJA-791: G-98 kullanıcı daveti, Role Profile ataması ve Permission Log.
  it('erişim sözleşmesinde Permission Log ucu vardır', () => {
    expect(contract('platform_core-access')).toContain(
      '/platform_core.api.access.list_permission_logs:',
    );
  });

  it.each([
    '/platform_core.api.identity.invite_user:',
    '/platform_core.api.identity.set_user_role_profiles:',
  ])('kimlik sözleşmesinde %s ucu vardır', (path) => {
    expect(contract('platform_core-identity')).toContain(path);
  });
});
