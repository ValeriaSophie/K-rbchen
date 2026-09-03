import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ToastHost, type ToastDetail } from './ToastHost';

function fire(detail: ToastDetail) {
  act(() => {
    window.dispatchEvent(new CustomEvent('koerbchen:toast', { detail }));
  });
}

describe('ToastHost', () => {
  it('announces a Ruf that arrived while another tab was open', () => {
    render(<ToastHost />);
    fire({ kind: 'ruf', text: 'Fläschchen bitte', emoji: '🍼', from: 'Mia' });

    // Inside a polite live region, so it reaches a screen reader without
    // interrupting whatever is being read.
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Fläschchen bitte');
    expect(region).toHaveTextContent('Mia');
  });

  it('can be dismissed before its timer runs out', async () => {
    const user = userEvent.setup();
    render(<ToastHost />);
    fire({ kind: 'reminder', text: 'Erinnerung: Arzttermin' });

    await user.click(screen.getByRole('button', { name: 'Meldung schließen' }));
    expect(screen.queryByText('Erinnerung: Arzttermin')).not.toBeInTheDocument();
  });

  it('stacks messages newest-first and keeps at most three', () => {
    render(<ToastHost />);
    for (const text of ['eins', 'zwei', 'drei', 'vier']) fire({ kind: 'ruf', text });

    const shown = screen.getAllByRole('button', { name: 'Meldung schließen' });
    expect(shown).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent(/vier.*drei.*zwei/s);
    expect(screen.queryByText('eins')).not.toBeInTheDocument();
  });
});
