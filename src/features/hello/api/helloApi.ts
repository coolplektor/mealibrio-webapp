import { getJson } from '@/infra/platform/http/httpClient';

const HELLO_ENDPOINT = '/api/hello';

export interface Greeting {
  message: string;
}

export async function getGreeting(signal?: AbortSignal): Promise<Greeting> {
  const result = await getJson(HELLO_ENDPOINT, signal);
  if (typeof result !== 'object' || result === null || !('message' in result) || typeof result.message !== 'string') {
    throw new Error('The API returned an invalid greeting');
  }
  return { message: result.message };
}
