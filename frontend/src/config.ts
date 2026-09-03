export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

// Derive ws(s):// from the API's http(s):// origin so there's only one URL
// to configure in most setups.
export const WS_URL = API_URL.replace(/^http/, 'ws');
