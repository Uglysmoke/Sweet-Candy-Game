
/**
 * Security Service for Ugly Crush Candy
 * Handles data integrity to prevent save-file tampering.
 */

// In a real production app, this key would be fetched from a secure environment
const SECRET_SALT = "ugly-candy-secure-2024-v1";

export class SecurityService {
  /**
   * Generates a simple hash for data integrity.
   * In a real app, use SHA-256 via Web Crypto API.
   */
  private static generateHash(data: string): string {
    let hash = 0;
    const combined = data + SECRET_SALT;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Signs game data before saving to "Cloud" (LocalStorage)
   */
  static signData(data: any): string {
    const serialized = JSON.stringify(data);
    const signature = this.generateHash(serialized);
    return JSON.stringify({
      payload: data,
      signature: signature,
      timestamp: Date.now()
    });
  }

  /**
   * Verifies and loads game data
   */
  static verifyAndLoad(signedString: string): any | null {
    try {
      const envelope = JSON.parse(signedString);
      if (!envelope.payload || !envelope.signature) return null;

      const expectedSignature = this.generateHash(JSON.stringify(envelope.payload));
      
      if (envelope.signature !== expectedSignature) {
        console.error("CRITICAL: Save file tampering detected! Integrity check failed.");
        return null;
      }

      return envelope.payload;
    } catch (e) {
      return null;
    }
  }

  /**
   * Validates if a score update is reasonable to prevent massive injections
   */
  static isScoreValid(points: number): boolean {
    // Basic heuristic: No single match event should reasonably exceed 50k points
    return points > 0 && points < 50000;
  }
}
