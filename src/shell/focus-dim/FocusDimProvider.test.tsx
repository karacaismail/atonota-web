import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FocusDimProvider } from './FocusDimProvider';
import { useFocusDim } from './useFocusDim';

function Dialog({ open }: { open: boolean }) {
  useFocusDim(open);
  return open ? <div role="dialog" aria-label="Onay" /> : null;
}

describe('odak perdesi', () => {
  it('iletişim kutusu açıkken görünür, kapanınca kalkar', () => {
    const { rerender } = render(
      <FocusDimProvider>
        <Dialog open />
      </FocusDimProvider>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body).toHaveAttribute('data-focus-dim', 'on');
    expect(document.querySelector('.shell-dim')).toHaveAttribute('data-on', 'true');
    rerender(
      <FocusDimProvider>
        <Dialog open={false} />
      </FocusDimProvider>,
    );
    expect(document.body).not.toHaveAttribute('data-focus-dim');
    expect(document.querySelector('.shell-dim')).toHaveAttribute('data-on', 'false');
  });
});
