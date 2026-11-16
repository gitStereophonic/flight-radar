/**
 * Tests for the `PlaneList` component: rendering rows, search filtering,
 * selection highlighting, and click handling.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeBasic } from '../../test/fixtures';
import { PlaneList } from './PlaneList';

const planes = [makeBasic('plane-10'), makeBasic('plane-2'), makeBasic('plane-1')];

describe('PlaneList', () => {
  it('lists planes in natural order', () => {
    render(<PlaneList planes={planes} selectedId={null} onSelect={() => {}} />);
    const rows = screen.getAllByRole('button').map((button) => button.textContent);
    expect(rows[0]).toContain('plane-1');
    expect(rows[1]).toContain('plane-2');
    expect(rows[2]).toContain('plane-10');
  });

  it('filters planes by the search text', async () => {
    render(<PlaneList planes={planes} selectedId={null} onSelect={() => {}} />);
    await userEvent.type(screen.getByLabelText('Search planes'), '10');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('plane-10')).toBeInTheDocument();
  });

  it('shows a message when nothing matches', async () => {
    render(<PlaneList planes={planes} selectedId={null} onSelect={() => {}} />);
    await userEvent.type(screen.getByLabelText('Search planes'), 'zzz');
    expect(screen.getByText('No planes match your search')).toBeInTheDocument();
  });

  it('marks the selected plane', () => {
    render(<PlaneList planes={planes} selectedId="plane-2" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /plane-2/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('plane-1').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the plane id when a row is clicked', async () => {
    const onSelect = vi.fn();
    render(<PlaneList planes={planes} selectedId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /plane-2/ }));
    expect(onSelect).toHaveBeenCalledWith('plane-2');
  });
});
