import crypto from 'crypto';

// Use a strong master key for encryption
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || 'your-fallback-32-character-key!!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16

export class EncryptionService {
  /**
   * Encrypt a plaintext string
   */
  static encrypt(plaintext: string): string {
    try {
      // Generate a random IV
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipher(ALGORITHM, MASTER_KEY);
      cipher.setAutoPadding(true);
      
      // Encrypt the text
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV + tag + encrypted data
      const result = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      
      return result;
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Decrypt an encrypted string
   */
  static decrypt(encryptedData: string): string {
    try {
      // Split the data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher
      const decipher = crypto.createDecipher(ALGORITHM, MASTER_KEY);
      decipher.setAuthTag(tag);
      decipher.setAutoPadding(true);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Validate if a string is properly encrypted
   */
  static isValidEncryptedData(data: string): boolean {
    try {
      const parts = data.split(':');
      return parts.length === 3;
    } catch {
      return false;
    }
  }
}