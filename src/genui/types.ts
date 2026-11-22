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
 * Eylemi alan işlev. Eylem sohbete kabul edildiyse `true` döner.
 * `false` dönerse blok kilitlenmez ve kullanıcıya durum gösterilir.
 */
export type GenUIActionHandler = (action: GenUIAction) => boolean;

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
