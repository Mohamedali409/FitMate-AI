import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface JwtUserPayload {
  userId: string;
  email?: string;
  role?: string;
  tokenVersion: number;
  sub?: string;
}

/**
 * Hash password with bcrypt using 12 salt rounds (NFR-SEC-003)
 */
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plaintext, salt);
}

/**
 * Verify password against stored hash using constant-time check
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Sign 15-minute JWT Access Token
 */
export function signAccessToken(payload: JwtUserPayload): string {
  const tokenPayload = {
    ...payload,
    sub: payload.userId,
  };
  return jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Verify and decode JWT Access Token
 */
export function verifyAccessToken(token: string): JwtUserPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
  }) as JwtUserPayload;

  if (!decoded.userId && decoded.sub) {
    decoded.userId = decoded.sub;
  }
  return decoded;
}

/**
 * Generate a cryptographically random refresh token
 */
export function generateRandomToken(prefix = 'fm_rt_'): string {
  return `${prefix}${crypto.randomBytes(32).toString('hex')}`;
}

export const generateRefreshTokenString = generateRandomToken;

/**
 * Hash a token with SHA-256 for persistent database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hash an IP address with a secret salt to prevent rainbow table precomputation (NFR-SEC-006)
 */
export function hashIp(ip: string): string {
  const salt = env.KMS_RECOVERY_KEY || 'default_ip_salt_secret';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex');
}

/**
 * Truncate user agent string safely for privacy and schema bounds
 */
export function truncateUserAgent(userAgent: string, maxLength = 100): string {
  if (!userAgent) return 'Unknown Device';
  return userAgent.trim().substring(0, maxLength);
}

/**
 * Ephemeral recovery encryption for successor refresh tokens during 30s grace window (DB-036)
 * Uses AES-256-GCM. Returns combined blob formatted as `ciphertext:iv:tag`.
 */
export function encryptSuccessorToken(successorToken: string): string {
  const keyBuffer = env.KMS_RECOVERY_KEY
    ? Buffer.from(env.KMS_RECOVERY_KEY, 'hex')
    : crypto.createHash('sha256').update(env.JWT_ACCESS_SECRET).digest();

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let ciphertext = cipher.update(successorToken, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${ciphertext}:${iv.toString('hex')}:${tag}`;
}

/**
 * Ephemeral recovery decryption for successor refresh tokens during grace window (DB-036)
 */
export function decryptSuccessorToken(encryptedBlob: string): string | null {
  try {
    const parts = encryptedBlob.split(':');
    if (parts.length !== 3) return null;

    const [ciphertext, ivHex, tagHex] = parts;
    const keyBuffer = env.KMS_RECOVERY_KEY
      ? Buffer.from(env.KMS_RECOVERY_KEY, 'hex')
      : crypto.createHash('sha256').update(env.JWT_ACCESS_SECRET).digest();

    const iv = Buffer.from(ivHex!, 'hex');
    const tag = Buffer.from(tagHex!, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}
