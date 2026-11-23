import {
  Checkbox as AntCheckbox,
  ConfigProvider,
  Radio as AntRadio,
  Segmented as AntSegmented,
  Switch as AntSwitch,
  Tag as AntTag,
} from 'antd';
import type {
  CheckboxProps,
  RadioProps,
  SegmentedProps,
  SwitchProps,
  TagProps,
  ThemeConfig,
} from 'antd';
import type { CheckboxRef } from 'antd/es/checkbox';
import type { RadioRef } from 'antd/es/radio';
import { forwardRef } from 'react';
import type { CSSProperties, ForwardedRef, ReactElement, ReactNode, RefAttributes } from 'react';

import { designSource } from '@/design';

import './controls.css';

const choice = designSource.choice;
type ChoiceKey = 'checkbox' | 'radio' | 'switch' | 'tabs' | 'tag';

/**
 * Source `choice.<control>.antdTheme` blocks carry size and color tokens. Colors stay with the
 * Foundation theme (light and dark contrast decisions), so only size and type tokens are layered.
 */
function sizeOnly(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !/color/i.test(key)));
}

function choiceTheme(key: ChoiceKey): ThemeConfig {
  const { token, components } = choice[key].antdTheme;
  return {
    token: sizeOnly(token),
    components: Object.fromEntries(
      Object.entries(components as Record<string, Record<string, unknown>>).map(([name, value]) => [
        name,
        sizeOnly(value),
      ]),
    ),
  };
}

const themes: Record<ChoiceKey, ThemeConfig> = {
  checkbox: choiceTheme('checkbox'),
  radio: choiceTheme('radio'),
  switch: choiceTheme('switch'),
  tabs: choiceTheme('tabs'),
  tag: choiceTheme('tag'),
};

/** Row heights from C3: the visible control is centred inside the locked row. */
const rowStyle = (height: number, style?: CSSProperties): CSSProperties => ({
  minBlockSize: height,
  alignItems: 'center',
  ...style,
});

function classes(...names: (string | undefined | false)[]) {
  return names.filter(Boolean).join(' ');
}

function Themed({ name, children }: { name: ChoiceKey; children: ReactNode }) {
  return <ConfigProvider theme={themes[name]}>{children}</ConfigProvider>;
}

const CheckboxControl = forwardRef<CheckboxRef, CheckboxProps>(function Checkbox(
  { className, style, ...props },
  ref,
) {
  return (
    <Themed name="checkbox">
      <AntCheckbox
        {...props}
        ref={ref}
        className={classes('atonota-checkbox', className)}
        style={rowStyle(choice.checkbox.height, style)}
      />
    </Themed>
  );
});

function CheckboxGroup(props: Parameters<typeof AntCheckbox.Group>[0]) {
  return (
    <Themed name="checkbox">
      <AntCheckbox.Group {...props} />
    </Themed>
  );
}

export const Checkbox = Object.assign(CheckboxControl, { Group: CheckboxGroup });

const RadioControl = forwardRef<RadioRef, RadioProps>(function Radio(
  { className, style, ...props },
  ref,
) {
  return (
    <Themed name="radio">
      <AntRadio
        {...props}
        ref={ref}
        className={classes('atonota-radio', className)}
        style={rowStyle(choice.radio.height, style)}
      />
    </Themed>
  );
});

const RadioButton = forwardRef<RadioRef, RadioProps>(function RadioButton(props, ref) {
  return (
    <Themed name="radio">
      <AntRadio.Button {...props} ref={ref} />
    </Themed>
  );
});

function RadioGroup(props: Parameters<typeof AntRadio.Group>[0]) {
  return (
    <Themed name="radio">
      <AntRadio.Group {...props} />
    </Themed>
  );
}

export const Radio = Object.assign(RadioControl, { Button: RadioButton, Group: RadioGroup });

type SwitchRef = HTMLButtonElement;

/** The 24 px track sits in the locked 28 px row (`choice.switch.height` / `trackHeight`). */
export const Switch = forwardRef<SwitchRef, SwitchProps>(function Switch(props, ref) {
  return (
    <Themed name="switch">
      <span className="atonota-switch" style={rowStyle(choice.switch.height)}>
        <AntSwitch {...props} ref={ref} />
      </span>
    </Themed>
  );
});

/** Tabs are the segmented style (C3). */
export const Tabs = forwardRef(function Tabs<Value>(
  { className, ...props }: SegmentedProps<Value>,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <Themed name="tabs">
      <AntSegmented<Value> {...props} ref={ref} className={classes('atonota-tabs', className)} />
    </Themed>
  );
}) as <Value = string | number>(
  props: SegmentedProps<Value> & RefAttributes<HTMLDivElement>,
) => ReactElement;

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { className, style, ...props },
  ref,
) {
  return (
    <Themed name="tag">
      <AntTag
        {...props}
        ref={ref}
        className={classes('atonota-tag', className)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          blockSize: choice.tag.height,
          // Pill shape (choice.tag.shape): half of the locked height.
          borderRadius: choice.tag.height / 2,
          gap: choice.tag.gap,
          paddingInline: choice.tag.paddingX,
          fontSize: choice.tag.fontSize,
          fontWeight: choice.tag.weight,
          ...style,
        }}
      />
    </Themed>
  );
});
