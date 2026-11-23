import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RecordViewProps } from '@/views/record';

vi.mock('@/views/record', () => ({
  RecordView: (props: RecordViewProps) => (
    <p>{`${props.doctype}|${props.name ?? ''}|${props.locale ?? ''}`}</p>
  ),
}));

const { default: RecordRoute } = await import('./RecordRoute');

describe('RecordRoute', () => {
  it('adresteki DocType ve kayıt adını kayıt görünümüne verir', () => {
    render(<RecordRoute module="hr" doctype="leave-application" name="HR-LAP-2026-00001" />);
    expect(screen.getByText('Leave Application|HR-LAP-2026-00001|tr')).toBeInTheDocument();
  });

  it('kodlanmış kayıt adını çözer', () => {
    render(<RecordRoute module="core" doctype="user" name="kisi%40example.test" />);
    expect(screen.getByText('User|kisi@example.test|tr')).toBeInTheDocument();
  });
});
