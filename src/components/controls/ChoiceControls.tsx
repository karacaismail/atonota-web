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
  CheckboxRef,
  GetRef,
  RadioGroupProps,
  RadioProps,
  SegmentedProps,
  SwitchProps,
  TagProps,
  ThemeConfig,
} from 'antd';
import { forwardRef } from 'react';
import type { CSSProperties, ForwardedRef, ReactElement, ReactNode, RefAttributes } from 'react';

import { designSource, primary } from '@/design';

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

/**
 * antd's click wave runs a fixed 0.4 s box-shadow and 2 s fade outside the shared motion tokens.
 * The source has no wave, so choice controls turn it off.
 */
const noWave = { disabled: true };

function Themed({ name, children }: { name: ChoiceKey; children: ReactNode }) {
  return (
    <ConfigProvider theme={themes[name]} wave={noWave}>
      {children}
    </ConfigProvider>
  );
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

/** antd's own group props, generic over the option value type. */
type CheckboxGroupProps<Value> = Parameters<typeof AntCheckbox.Group<Value>>[0];

const CheckboxGroup = forwardRef(function CheckboxGroup<Value>(
  { className, ...props }: CheckboxGroupProps<Value>,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <Themed name="checkbox">
      <AntCheckbox.Group<Value>
        {...props}
        ref={ref}
        className={classes('atonota-checkbox-group', className)}
      />
    </Themed>
  );
}) as <Value = unknown>(
  props: CheckboxGroupProps<Value> & RefAttributes<HTMLDivElement>,
) => ReactElement;

export const Checkbox = Object.assign(CheckboxControl, { Group: CheckboxGroup });

type RadioRef = GetRef<typeof AntRadio>;

/** Radio is the card style (C3): a 32 px bordered row, see `.atonota-radio` in controls.css. */
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

const RadioButton = forwardRef<RadioRef, RadioProps>(function RadioButton(
  { className, ...props },
  ref,
) {
  return (
    <Themed name="radio">
      <AntRadio.Button
        {...props}
        ref={ref}
        className={classes('atonota-radio-button', className)}
      />
    </Themed>
  );
});

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(props, ref) {
  return (
    <Themed name="radio">
      <AntRadio.Group {...props} ref={ref} />
    </Themed>
  );
});

export const Radio = Object.assign(RadioControl, { Button: RadioButton, Group: RadioGroup });

type SwitchRef = HTMLButtonElement;

/** Source `choice.switch.showText`: the track shows its state. Callers may pass their own text. */
const switchText = choice.switch.showText
  ? { checkedChildren: 'Açık', unCheckedChildren: 'Kapalı' }
  : {};

/**
 * The checked track is the solid primary color in both themes, so its text uses the light
 * primary text (black 85 %, source `primary.light`). The unchecked text is set in controls.css.
 */
const switchTheme: ThemeConfig = {
  // Squared handle radius: the source example draws 3 px, equal to the source track padding.
  token: { borderRadiusXS: choice.switch.padding },
  components: { Switch: { colorTextLightSolid: primary.light.text } },
};

/**
 * The 24 px track sits in the locked 28 px row (`choice.switch.height` / `trackHeight`).
 * `choice.switch.squared`: the track uses the control radius (`.atonota-switch-squared`).
 */
export const Switch = forwardRef<SwitchRef, SwitchProps>(function Switch(props, ref) {
  return (
    <Themed name="switch">
      <ConfigProvider theme={switchTheme}>
        <span
          className={classes('atonota-switch', choice.switch.squared && 'atonota-switch-squared')}
          // The label keeps the source size (14 px); it must not inherit the 16 px body text.
          style={rowStyle(choice.switch.height, { fontSize: choice.switch.labelSize })}
        >
          <AntSwitch {...switchText} {...props} ref={ref} />
        </span>
      </ConfigProvider>
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
