const apiBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;
if (typeof apiBaseUrl !== 'string' || apiBaseUrl.trim() === '') {
  throw new Error('VITE_API_BASE_URL is required');
}
const url = new URL(apiBaseUrl);
if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
  throw new Error('VITE_API_BASE_URL must be an HTTP(S) origin');
}
export const environment = { apiBaseUrl: url.origin } as const;
