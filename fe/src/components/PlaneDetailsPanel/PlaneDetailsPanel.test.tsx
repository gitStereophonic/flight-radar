/**
 * Tests for the `PlaneDetailsPanel` component: loading state, formatted
 * details, error state, and the close button.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeDetailed } from '../../test/fixtures';
import { PlaneDetailsPanel } from './PlaneDetailsPanel';

describe('PlaneDetailsPanel', () => {
  it('shows a loading state before the first details arrive', () => {
    render(<PlaneDetailsPanel planeId="plane-1" details={null} error={null} onClose={() => {}} />);
    expect(screen.getByText('Loading flight details…')).toBeInTheDocument();
    expect(screen.getByText('plane-1')).toBeInTheDocument();
  });

  it('shows the flight information with converted units', () => {
    render(
      <PlaneDetailsPanel
        planeId="plane-1"
        details={makeDetailed('plane-1')}
        error={null}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('DE1234')).toBeInTheDocument();
    expect(screen.getByText('Delta Air Lines')).toBeInTheDocument();
    expect(screen.getByText('JFK')).toBeInTheDocument();
    expect(screen.getByText('LAX')).toBeInTheDocument();
    expect(screen.getByText('35,000 ft')).toBeInTheDocument();
    expect(screen.getByText('550 kts')).toBeInTheDocument();
    expect(screen.getByText('cruising')).toBeInTheDocument();
    expect(screen.getByText('180 / 200')).toBeInTheDocument();
  });

  it('shows an error message', () => {
    render(
      <PlaneDetailsPanel
        planeId="plane-1"
        details={null}
        error="Plane plane-1 not found"
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Plane plane-1 not found');
    expect(screen.queryByText('Loading flight details…')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <PlaneDetailsPanel
        planeId="plane-1"
        details={makeDetailed()}
        error={null}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
