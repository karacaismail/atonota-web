/**
 * Tek karar kaynağı: `design/source/control-size-config.json`.
 * Bu dosya kaynağı olduğu gibi dışa açar. Değerler kodda ikinci kez yazılmaz.
 */
import source from '@design-source/control-size-config.json';

export type DesignSource = typeof source;
export type SizeKey = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark';

export const designSource: DesignSource = source;
