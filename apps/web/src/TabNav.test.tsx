import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TabNav } from './App';

const tabs = [
  { id: 'trinken', label: 'Trinken', icon: '🥤' },
  { id: 'windel', label: 'Windel', icon: '🧷' },
  { id: 'sterne', label: 'Sterne', icon: '⭐' },
];

describe('TabNav', () => {
  it('renders a tab for every entry', () => {
    render(<TabNav tabs={tabs} active="trinken" onSelect={() => {}} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    for (const t of tabs) {
      expect(screen.getByRole('tab', { name: t.label })).toBeInTheDocument();
    }
  });

  it('marks only the active tab as selected', () => {
    render(<TabNav tabs={tabs} active="windel" onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Windel' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Trinken' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSelect with the clicked tab id', async () => {
    const onSelect = vi.fn();
    render(<TabNav tabs={tabs} active="trinken" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Sterne' }));
    expect(onSelect).toHaveBeenCalledWith('sterne');
  });

  it('gives the strip one tab stop and moves with the arrow keys', async () => {
    const onSelect = vi.fn();
    render(<TabNav tabs={tabs} active="windel" onSelect={onSelect} />);

    // Roving tabindex: the whole strip is one stop, not three.
    expect(screen.getByRole('tab', { name: 'Windel' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Trinken' })).toHaveAttribute('tabindex', '-1');

    await userEvent.tab();
    expect(screen.getByRole('tab', { name: 'Windel' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenCalledWith('sterne');
    await userEvent.keyboard('{Home}');
    expect(onSelect).toHaveBeenCalledWith('trinken');
  });

  it('wires each tab to the panel it controls', () => {
    render(<TabNav tabs={tabs} active="trinken" onSelect={() => {}} />);
    const tab = screen.getByRole('tab', { name: 'Trinken' });
    expect(tab).toHaveAttribute('id', 'tab-trinken');
    expect(tab).toHaveAttribute('aria-controls', 'panel-trinken');
  });
});
