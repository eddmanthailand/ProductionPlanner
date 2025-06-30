import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Make sure to set MASTER_ENCRYPTION_KEY in Replit Secrets
// It should be a 64-character hex string (32 bytes)
const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY;

if (!masterKeyHex || Buffer.from(masterKeyHex, 'hex').length !== 32) {
  throw new Error('Invalid MASTER_ENCRYPTION_KEY. Please set a 64-character hex key in Replit Secrets.');
}

const masterKey = Buffer.from(masterKeyHex, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

export function decrypt(encryptedText: string): string {
  const data = Buffer.from(encryptedText, 'hex');
  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}