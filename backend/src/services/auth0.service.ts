import { env } from '../config/env';

interface Auth0TokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface Auth0Profile {
  sub: string;
  email: string;
  nickname?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * This backend acts as the OAuth *client* against Auth0 (the "Regular Web
 * Application" flow), not the SPA-plus-bearer-token pattern. That's what
 * lets us issue our own HttpOnly session JWT afterwards — see the backend
 * README for why.
 */
export function buildAuthorizeUrl(state: string): string {
  const url = new URL(`https://${env.AUTH0_DOMAIN}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.AUTH0_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.AUTH0_CALLBACK_URL);
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<Auth0TokenResponse> {
  const res = await fetch(`https://${env.AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: env.AUTH0_CLIENT_ID,
      client_secret: env.AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: env.AUTH0_CALLBACK_URL,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 token exchange failed (${res.status}): ${body}`);
  }

  return (await res.json()) as Auth0TokenResponse;
}

export async function fetchAuth0Profile(accessToken: string): Promise<Auth0Profile> {
  const res = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 userinfo fetch failed (${res.status}): ${body}`);
  }

  return (await res.json()) as Auth0Profile;
}

export function buildLogoutUrl(): string {
  const url = new URL(`https://${env.AUTH0_DOMAIN}/v2/logout`);
  url.searchParams.set('client_id', env.AUTH0_CLIENT_ID);
  url.searchParams.set('returnTo', env.AUTH0_LOGOUT_REDIRECT_URL ?? env.FRONTEND_URL);
  return url.toString();
}
