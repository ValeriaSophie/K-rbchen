import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) })),
    );
  });

  it('renders the app name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Körbchen' })).toBeInTheDocument();
  });
});
