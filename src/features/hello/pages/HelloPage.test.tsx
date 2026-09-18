import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { getGreeting } from '../api/helloApi';
import { HelloPage } from './HelloPage';

vi.mock('../api/helloApi', () => ({ getGreeting: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it('shows the greeting received from the API', async () => {
  vi.mocked(getGreeting).mockResolvedValue({ message: 'Hello from the API' });
  render(<HelloPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Connecting');
  expect(await screen.findByText('Hello from the API')).toBeInTheDocument();
});
it('allows retry after a failed request', async () => {
  vi.mocked(getGreeting).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ message: 'Recovered' });
  render(<HelloPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t connect');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Recovered')).toBeInTheDocument();
});
