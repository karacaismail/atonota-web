import type { runtimeDesignSource } from '../../vite/runtime-design-source';

export type SizeKey = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark';
export type DesignSource = typeof runtimeDesignSource;

declare const __RUNTIME_DESIGN_SOURCE__: DesignSource;

export const designSource = __RUNTIME_DESIGN_SOURCE__;
