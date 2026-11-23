/**
 * Ekranda gösterilmesine izin verilen araçlar.
 * Listede olmayan araç olayı yok sayılır. Modelin iç düşüncesi araç değildir.
 * Gerçek liste arka uçla birlikte belirlenir. Yeni araç buraya eklenir.
 */
export const ALLOWED_TOOLS = [
  'orders.read',
  'payments.read',
  'shipments.read',
  'stock.read',
  'report.build',
  'notify.draft',
  'rule.draft',
  'action.receive',
] as const;

export type AllowedTool = (typeof ALLOWED_TOOLS)[number];

export function isAllowedTool(value: unknown): value is AllowedTool {
  return typeof value === 'string' && (ALLOWED_TOOLS as readonly string[]).includes(value);
}
