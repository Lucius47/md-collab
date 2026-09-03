import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AppTokenPayload {
  sub: string; // our internal user id
  username: string;
}

export function signAppToken(payload: AppTokenPayload): string {
  // return jwt.sign(payload, env.APP_JWT_SECRET, { expiresIn: env.APP_JWT_EXPIRES_IN });
  return jwt.sign(payload, env.APP_JWT_SECRET, {expiresIn: env.APP_JWT_EXPIRES_IN as SignOptions['expiresIn'],
});
}

export function verifyAppToken(token: string): AppTokenPayload {
  return jwt.verify(token, env.APP_JWT_SECRET) as AppTokenPayload;
}
