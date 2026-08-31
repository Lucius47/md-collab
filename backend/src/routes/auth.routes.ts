import { Router } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import {
  buildAuthorizeUrl,
  buildLogoutUrl,
  exchangeCodeForTokens,
  fetchAuth0Profile,
} from '../services/auth0.service';
import { signAppToken } from '../services/token.service';
import { prisma } from '../db/prisma';
import { BadRequestError } from '../utils/errors';

export const authRouter = Router();

const STATE_COOKIE = 'mdc_oauth_state';

authRouter.get('/login', (_req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(buildAuthorizeUrl(state));
});

authRouter.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    if (!code || typeof code !== 'string') throw new BadRequestError('Missing authorization code');
    if (!state || state !== expectedState) throw new BadRequestError('Invalid OAuth state');

    const tokens = await exchangeCodeForTokens(code);
    const profile = await fetchAuth0Profile(tokens.access_token);
    if (!profile.email) throw new BadRequestError('OAuth provider did not return an email');

    const baseUsername =
      (profile.nickname || profile.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40) || 'user';

    let user = await prisma.user.findUnique({ where: { oauthProviderId: profile.sub } });

    if (!user) {
      // Ensure username uniqueness by appending a numeric suffix on collision.
      let username = baseUsername;
      let attempt = 0;
      while (await prisma.user.findUnique({ where: { username } })) {
        attempt += 1;
        username = `${baseUsername}${attempt}`;
      }

      user = await prisma.user.create({
        data: { username, email: profile.email, oauthProviderId: profile.sub },
      });
    }

    const token = signAppToken({ sub: user.id, username: user.username });
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: env.COOKIE_DOMAIN,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(env.FRONTEND_URL);
  })
);

authRouter.post('/logout', (req, res) => {
  res.clearCookie(env.COOKIE_NAME, { domain: env.COOKIE_DOMAIN });
  // The frontend can optionally redirect the browser to this URL afterwards
  // to also clear the Auth0-side session (single sign-out).
  res.json({ logoutUrl: buildLogoutUrl() });
});

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
