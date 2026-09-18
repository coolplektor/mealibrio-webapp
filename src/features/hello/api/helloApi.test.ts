import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJson } from '@/infra/platform/http/httpClient';
import { getGreeting } from './helloApi';

vi.mock('@/infra/platform/http/httpClient', () => ({ getJson: vi.fn() }));
describe('hello API contract', () => {
  beforeEach(() => vi.resetAllMocks());
  it('calls the owned endpoint and parses its response', async () => {
    vi.mocked(getJson).mockResolvedValue({ message: 'Hello' });
    expect(await getGreeting()).toEqual({ message: 'Hello' });
    expect(getJson).toHaveBeenCalledWith('/api/hello', undefined);
  });
  it('rejects malformed responses', async () => {
    vi.mocked(getJson).mockResolvedValue({ message: 42 });
    await expect(getGreeting()).rejects.toThrow('invalid greeting');
  });
});
