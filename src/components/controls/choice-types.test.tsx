/**
 * Type and ref contract for the choice groups (review 2, S4).
 * `npm run typecheck` checks the type lines; Vitest checks the forwarded refs.
 */
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { Checkbox, Radio } from '.';

describe('choice groups', () => {
  it('forward the group element ref', () => {
    const checkboxGroup = createRef<HTMLDivElement>();
    const radioGroup = createRef<HTMLDivElement>();
    render(
      <>
        <Checkbox.Group ref={checkboxGroup} options={['a']} />
        <Radio.Group ref={radioGroup} options={['a']} />
      </>,
    );
    expect(checkboxGroup.current).toBeInstanceOf(HTMLDivElement);
    expect(checkboxGroup.current).toHaveClass('ant-checkbox-group');
    expect(radioGroup.current).toBeInstanceOf(HTMLDivElement);
    expect(radioGroup.current).toHaveClass('ant-radio-group');
  });

  it('keep the Checkbox.Group value type', () => {
    const numbers = (value: number[]) => value;
    render(
      <>
        <Checkbox.Group<number> options={[{ value: 1, label: 'Bir' }]} onChange={numbers} />
        <Checkbox.Group value={[1, 2]} onChange={numbers} />
        {/* @ts-expect-error The value type is kept: a string array is not a number array. */}
        <Checkbox.Group<number> value={['a']} />
      </>,
    );
    expect(true).toBe(true);
  });
});
