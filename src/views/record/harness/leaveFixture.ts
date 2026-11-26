import type { DocField, DocTypeMeta, NewRecordContext } from '../types';

export const LEAVE_CONTEXT: NewRecordContext = {
  employee: 'HR-EMP-TEST-01',
  employee_name: 'Örnek Kişi 1',
  leave_type: 'Annual Leave',
  leave_balance: 8.5,
  sources: {
    employee: 'Employee',
    employee_name: 'Employee',
    leave_type: 'Leave Type',
    leave_balance: 'Leave Ledger Entry',
  },
};

export const EMPTY_LEAVE_CONTEXT: NewRecordContext = {
  employee: null,
  employee_name: null,
  leave_type: null,
  leave_balance: null,
  sources: { employee: null, employee_name: null, leave_type: null, leave_balance: null },
};

const field = (
  fieldname: string,
  fieldtype: string,
  label: string,
  component: string,
  extra: Partial<DocField> = {},
): DocField => ({
  fieldname,
  fieldtype,
  label,
  component,
  read_only: false,
  sensitivity: 'standard',
  ...extra,
});

/** Synthetic leave request from the approved draft. No live adapter is used. */
export const LEAVE_META: DocTypeMeta = {
  schema: {
    name: 'Leave Application',
    module: 'HRMS TR',
    sensitivity: 'standard',
    title_field: 'employee_name',
    search_fields: 'employee_name',
    sort_field: 'modified',
    fields: [
      field('person_section', 'Section Break', 'Kişi bilgisi', 'section'),
      field('employee_name', 'Data', 'Ad', 'input', {
        read_only: true,
      }),
      field('person_column', 'Column Break', '', 'column'),
      field('leave_balance', 'Data', 'Kalan yıllık izin', 'input', {
        read_only: true,
      }),
      field('leave_section', 'Section Break', 'İzin bilgisi', 'section'),
      field('leave_type', 'Select', 'İzin türü', 'select', {
        reqd: true,
        choices: [
          { value: 'Annual Leave', label: 'Yıllık izin' },
          { value: 'Casual Leave', label: 'Mazeret izni' },
          { value: 'Sick Leave', label: 'Raporlu izin' },
          { value: 'Unpaid Leave', label: 'Ücretsiz izin' },
        ],
      }),
      field('from_date', 'Date', 'Başlangıç tarihi', 'date', {
        reqd: true,
        description: 'İzninizin başladığı günü yazın.',
      }),
      field('to_date', 'Date', 'Bitiş tarihi', 'date', { reqd: true }),
      field('description', 'Small Text', 'Açıklama', 'small-text', {
        description: 'Yöneticiniz bu metni okur.',
      }),
    ],
  },
  child_tables: {},
  catalog_version: 2,
  meta_hash: 'leave-fixture',
  perm_version: 'leave-fixture',
  mobile_cache_allowed: false,
};
