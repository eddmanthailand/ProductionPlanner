// Simple encryption service for development
export class EncryptionService {
  /**
   * Simple encryption for development (using base64)
   */
  static encrypt(plaintext: string): string {
    try {
      return Buffer.from(plaintext).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      return plaintext;
    }
  }

  /**
   * Simple decryption for development (using base64)
   */
  static decrypt(encryptedData: string): string {
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData;
    }
  }
}