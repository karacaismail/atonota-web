/**
 * GenUI blok sözleşmesi (U1).
 *
 * Asistan yanıtı `{ text, steps, ui[] }` biçimindedir. `ui` tipli blok dizisidir.
 * Sunucudan gelen veri güvenilmez sayılır. `schema.ts` her bloğu doğrular.
 */

export interface KpiItem {
  label: string;
  value: string;
  delta?: number;
  /** Değişim birimi. Örnek: "%" ya da "puan". */
  unit?: string;
  /** Düşüş iyi bir şeyse "down" olur. Örnek: iade oranı. */
  goodWhen?: 'up' | 'down';
}

export interface KpisBlock {
  type: 'kpis';
  items: KpiItem[];
}

export interface ChartBar {
  label: string;
  value: number;
}

export interface ChartBlock {
  type: 'chart';
  title: string;
  bars: ChartBar[];
}

export interface TableColumn {
  key: string;
  title: string;
  /**
   * `id`: kimlik ya da kısa değer. Satır sarılmaz, en küçük genişlik korunur.
   * `text`: açıklama. Kelimeler arasından sarılır. Varsayılan budur.
   */
  kind?: 'id' | 'text';
}

export type TableCell = string | number;

export interface TableBlock {
  type: 'table';
  title: string;
  rowKey: string;
  columns: TableColumn[];
  rows: Record<string, TableCell>[];
}

/** Yazma işleminde değişecek tek alan. Onay ekranı önce ve sonra değerini gösterir. */
export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

export interface ConfirmBlock {
  type: 'confirm';
  /**
   * İşlem kimliği. Sunucu onayı bu kimliğe bağlar.
   * Sözleşme: sunucu her yeni işlem için yeni bir kimlik üretir.
   * Aynı soru yeniden sorulsa da kimlik yenidir.
   * Onay tek kullanımlıktır. Aynı kimlik ikinci kez gönderilmez.
   */
  id: string;
  title: string;
  /** İşlemin özeti. Örnek: kime ne gideceği ve geri alınıp alınamayacağı. */
  summary: string;
  /** Değişecek alanlar. Boş olamaz. Kullanıcı değişikliği görmeden onay vermez. */
  changes: FieldChange[];
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  /**
   * Onayın son geçerlilik zamanı, ISO 8601. Örnek: `2026-11-24T12:00:00+03:00`.
   * Süre geçince blok "Süresi doldu" yazar ve onay düğmesi görünmez.
   */
  expiresAt?: string;
  /**
   * Risk düzeyi. Düzeyi sunucu atar, model değiştiremez.
   * Düzey gelmezse kart R1 gibi davranır.
   * - R1: tek "Onayla" düğmesi.
   * - R2: "Önizlemeyi okudum." kutusu işaretlenince düğme açılır.
   * - R3: kullanıcı `target.name` değerini elle yazınca düğme açılır.
   */
  risk?: RiskLevel;
  /** Hedef kayıt. `label` kartta görünür. R3 düzeyinde `name` elle yazılır. R3 için zorunludur. */
  target?: ConfirmTarget;
  /**
   * Sunucu geri alma önerisi ucunu bildirirse `true` olur.
   * Yalnız o zaman onaydan sonra "Geri almayı öner" düğmesi görünür.
   * Kartta hiçbir zaman "Geri al" düğmesi yoktur. Sunucuda geri alma yok.
   */
  undoProposal?: boolean;
}

export type RiskLevel = 'R1' | 'R2' | 'R3';

export interface ConfirmTarget {
  label: string;
  name: string;
}

export interface FormOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  kind: 'text' | 'select' | 'checks';
  options?: FormOption[];
  value?: string | string[];
  required?: boolean;
}

export interface FormBlock {
  type: 'form';
  id: string;
  title: string;
  submitLabel: string;
  cancelLabel?: string;
  fields: FormField[];
}

export interface ChoicesBlock {
  type: 'choices';
  items: string[];
}

/** Bilinmeyen ya da doğrulanamayan blok. Yalnız JSON olarak gösterilir. */
export interface UnknownBlock {
  type: 'unknown';
  raw: unknown;
}

export type KnownBlock =
  KpisBlock | ChartBlock | TableBlock | ConfirmBlock | FormBlock | ChoicesBlock;

export type GenUIBlock = KnownBlock | UnknownBlock;

export type BlockType = KnownBlock['type'];

export type FormValues = Record<string, string | string[]>;

/**
 * Eylemin sonucu.
 * - `accepted`: sohbet kararı aldı. Blok kilitlenir.
 * - `busy`: sohbet meşgul. Blok açık kalır, kullanıcı sonra yeniden dener.
 * - `used`: bu onay daha önce gönderildi. Blok kilitlenir, karar yeniden gitmez.
 */
export type GenUIActionResult = 'accepted' | 'busy' | 'used';

/** Eylemi alan işlev. */
export type GenUIActionHandler = (action: GenUIAction) => GenUIActionResult;

export type GenUIDecision = 'approved' | 'rejected';

/**
 * Sohbet geçmişinden çıkarılan kararlar. Anahtar blok kimliğidir.
 * Blok yeniden çizilince kararı buradan okur. Örnek: sohbet değişip geri gelince.
 */
export type GenUIDecisions = Readonly<Record<string, GenUIDecision>>;

/**
 * Bloktan çıkan kullanıcı eylemi.
 * Eylem yalnız kullanıcı bir düğmeye basınca oluşur (U4).
 * Sohbet bu eylemi yeni bir kullanıcı mesajına çevirir.
 */
export type GenUIAction =
  | { kind: 'ask'; text: string }
  | { kind: 'confirm'; blockId: string; decision: 'approved' | 'rejected'; title: string }
  | {
      kind: 'form';
      blockId: string;
      decision: 'approved' | 'rejected';
      title: string;
      values?: FormValues;
    };
