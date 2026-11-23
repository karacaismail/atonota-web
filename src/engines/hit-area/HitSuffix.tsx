import { HIT_SUFFIX_CLASS } from './engine';

/**
 * R9: `<input>` pseudo-element alamaz. Bu görünmez suffix antd Input'u affix
 * sarmalayıcıya alır; kural sarmalayıcıya uygulanır. Kullanım: `<Input suffix={<HitSuffix />} />`.
 */
export function HitSuffix() {
  return <span className={HIT_SUFFIX_CLASS} aria-hidden="true" />;
}
