import { type ConditionContext, evaluateFieldState } from './conditions';
import type { DocField } from './types';

export interface LayoutColumn {
  key: string;
  label: string | null;
  fields: DocField[];
}

export interface LayoutSection {
  key: string;
  label: string | null;
  description: string | null;
  collapsible: boolean;
  columns: LayoutColumn[];
  effectiveColumnCount: number;
}

export interface LayoutTab {
  key: string;
  label: string;
  sections: LayoutSection[];
}

export interface FormLayout {
  hasExplicitTabs: boolean;
  tabs: LayoutTab[];
}

export interface BuildLayoutOptions extends ConditionContext {
  isPhoneViewport: boolean;
  defaultTabLabel: string;
}

export function isLayoutBreakFieldType(fieldtype: string): boolean {
  return fieldtype === 'Tab Break' || fieldtype === 'Section Break' || fieldtype === 'Column Break';
}

export function buildFormLayout(
  fields: readonly DocField[],
  options: BuildLayoutOptions,
): FormLayout {
  const { defaultTabLabel } = options;
  let hasExplicitTabs = false;

  interface MutableTab {
    key: string;
    label: string;
    visible: boolean;
    sections: MutableSection[];
  }

  interface MutableSection {
    key: string;
    label: string | null;
    description: string | null;
    collapsible: boolean;
    visible: boolean;
    columns: LayoutColumn[];
  }

  const rawTabs: MutableTab[] = [];
  let currentTab: MutableTab | undefined;
  let currentSection: MutableSection | undefined;
  let currentColumn: LayoutColumn | undefined;
  let autoCounter = 0;

  const ensureTab = (): MutableTab => {
    if (!currentTab) {
      autoCounter += 1;
      currentTab = {
        key: `tab-default-${autoCounter}`,
        label: defaultTabLabel,
        visible: true,
        sections: [],
      };
      rawTabs.push(currentTab);
    }
    return currentTab;
  };

  const ensureSection = (): MutableSection => {
    const tab = ensureTab();
    if (!currentSection) {
      autoCounter += 1;
      currentSection = {
        key: `section-default-${autoCounter}`,
        label: null,
        description: null,
        collapsible: false,
        visible: true,
        columns: [],
      };
      tab.sections.push(currentSection);
    }
    return currentSection;
  };

  const ensureColumn = (): LayoutColumn => {
    const section = ensureSection();
    if (!currentColumn) {
      autoCounter += 1;
      currentColumn = {
        key: `column-default-${autoCounter}`,
        label: null,
        fields: [],
      };
      section.columns.push(currentColumn);
    }
    return currentColumn;
  };

  for (const field of fields) {
    if (field.fieldtype === 'Tab Break') {
      hasExplicitTabs = true;
      const state = evaluateFieldState(field, options);
      currentTab = {
        key: field.fieldname,
        label: field.label ?? field.fieldname,
        visible: state.visible,
        sections: [],
      };
      rawTabs.push(currentTab);
      currentSection = undefined;
      currentColumn = undefined;
      continue;
    }

    if (field.fieldtype === 'Section Break') {
      const tab = ensureTab();
      const state = evaluateFieldState(field, options);
      currentSection = {
        key: field.fieldname,
        label: field.label ?? null,
        description: field.description ?? null,
        collapsible: state.collapsible,
        visible: state.visible,
        columns: [],
      };
      tab.sections.push(currentSection);
      currentColumn = undefined;
      continue;
    }

    if (field.fieldtype === 'Column Break') {
      const section = ensureSection();
      const state = evaluateFieldState(field, options);
      currentColumn = {
        key: field.fieldname,
        label: state.visible ? (field.label ?? null) : null,
        fields: [],
      };
      if (state.visible) {
        section.columns.push(currentColumn);
      }
      continue;
    }

    // Review 1 Finding 4: Evaluate field visibility before assigning it to a column so hidden fields
    // never produce empty visible sections or inflate column counts.
    const fieldState = evaluateFieldState(field, options);
    if (!fieldState.visible) {
      continue;
    }

    const col = ensureColumn();
    col.fields.push(field);
  }

  const tabs: LayoutTab[] = [];
  for (const tab of rawTabs) {
    if (!tab.visible) {
      continue;
    }
    const sections: LayoutSection[] = [];
    for (const section of tab.sections) {
      if (!section.visible) {
        continue;
      }
      const nonEmptyColumns = section.columns.filter((col) => col.fields.length > 0);
      if (nonEmptyColumns.length === 0) {
        continue;
      }
      sections.push({
        key: section.key,
        label: section.label,
        description: section.description,
        collapsible: section.collapsible,
        columns: nonEmptyColumns,
        effectiveColumnCount: options.isPhoneViewport ? 1 : Math.max(1, nonEmptyColumns.length),
      });
    }
    // Review 1 Minor 3: Omit tabs that have zero visible sections.
    if (sections.length > 0) {
      tabs.push({
        key: tab.key,
        label: tab.label,
        sections,
      });
    }
  }

  return {
    hasExplicitTabs: hasExplicitTabs && tabs.length > 0,
    tabs,
  };
}
