import { environment } from '@/infra/platform/config/environment';

export async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${environment.apiBaseUrl}${path}`, {
    signal,
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
