import type { HomeSummary, PendingApproval } from '@/api';
import type { ModuleEnvironment } from '@/modules';

/** Onay ya da ret isteğinin kimliği. `version` okunan kaydın sürümüdür. */
export type HomeDecisionTarget = Pick<PendingApproval, 'name' | 'version'>;

/**
 * Ana sayfanın (Bekleyenler) veri bağlantısı.
 * Kabuk API istemcisi kurmaz. Bağlantıyı `createShellHomeData` ortak istemciden kurar.
 * Hata olursa işlevler `HomeDataError` ile reddedilir. Hatanın metni kullanıcıya gösterilir.
 */
export interface ShellHomeData {
  /** Dört parçayı okur: bekleyen onaylar, sorunlu kayıtlar, son değişiklikler, özet sayılar. */
  load: (signal: AbortSignal) => Promise<HomeSummary>;
  approve: (target: HomeDecisionTarget) => Promise<void>;
  reject: (target: HomeDecisionTarget) => Promise<void>;
}

/** Kullanıcıya gösterilecek hata. `message` Türkçe ve yalın bir cümledir. */
export class HomeDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeDataError';
  }
}

/**
 * Modül ortamına bağlı ana sayfa bağlantısı.
 * Uygulama girişi modül ortamını `createShellModuleEnvironment` ile kurar.
 * O işlev ana sayfa bağlantısını da buraya yazar. Böylece giriş ayrı bir alan vermek zorunda kalmaz.
 */
const byEnvironment = new WeakMap<ModuleEnvironment, ShellHomeData>();

export function registerHomeData(env: ModuleEnvironment, data: ShellHomeData): void {
  byEnvironment.set(env, data);
}

export function homeDataForModules(env: ModuleEnvironment | undefined): ShellHomeData | undefined {
  return env ? byEnvironment.get(env) : undefined;
}
