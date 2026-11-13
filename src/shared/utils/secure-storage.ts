/**
 * 🔒 SECURITY: Secure Storage Utility
 * Provides secure storage for authentication tokens and user data
 * Note: Frontend sessionStorage has inherent limitations. For production:
 * - Use httpOnly cookies (set by backend)
 * - Implement session management backend
 * - Use Web Crypto API for sensitive client data
 */

const STORAGE_PREFIX = 'app_';
const STORAGE_VERSION = 'v1';

/**
 * Simple storage with validation (not encrypted - use backend cookies for tokens)
 * 🔒 SECURITY: Frontend encryption is not recommended due to key storage risks
 */
export class SecureStorage {
  /**
   * Set item with version check
   */
  static setItem(key: string, value: any): void {
    try {
      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      const payload = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        data: value,
      };
      
      sessionStorage.setItem(prefixedKey, JSON.stringify(payload));
    } catch (error) {
      console.warn(`[SecureStorage] Failed to set item ${key}:`, error);
    }
  }

  /**
   * Get item with validation
   */
  static getItem(key: string): any {
    try {
      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      const stored = sessionStorage.getItem(prefixedKey);
      
      if (!stored) return null;
      
      const payload = JSON.parse(stored);
      
      // 🔒 SECURITY: Validate version and age
      if (payload.version !== STORAGE_VERSION) {
        this.removeItem(key);
        return null;
      }
      
      // Check for stale data (optional - adjust timeout as needed)
      const ageMs = Date.now() - payload.timestamp;
      const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (ageMs > maxAgeMs) {
        this.removeItem(key);
        return null;
      }
      
      return payload.data;
    } catch (error) {
      console.warn(`[SecureStorage] Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item
   */
  static removeItem(key: string): void {
    try {
      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      sessionStorage.removeItem(prefixedKey);
    } catch (error) {
      console.warn(`[SecureStorage] Failed to remove item ${key}:`, error);
    }
  }

  /**
   * Clear all app storage
   */
  static clear(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[SecureStorage] Failed to clear storage:', error);
    }
  }

  /**
   * Get all stored keys
   */
  static getAllKeys(): string[] {
    const keys: string[] = [];
    const appStoragePrefix = STORAGE_PREFIX;
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(appStoragePrefix)) {
        keys.push(key.substring(appStoragePrefix.length));
      }
    }
    
    return keys;
  }
}

/**
 * 🔒 SECURITY BEST PRACTICES:
 * 
 * FOR PRODUCTION SYSTEMS, FOLLOW THESE GUIDELINES:
 * 
 * 1. TOKEN STORAGE:
 *    ❌ DON'T: Store tokens in sessionStorage/localStorage (vulnerable to XSS)
 *    ✅ DO: Use httpOnly, Secure cookies (backend sets these)
 *    
 * 2. USER DATA:
 *    - Store only non-sensitive user info (id, name, email)
 *    - NEVER store passwords, SSNs, credit cards
 *    - Validate all stored data on load
 *    
 * 3. CSRF PROTECTION:
 *    ✅ DO: Use SameSite cookie attribute (backend config)
 *    ✅ DO: Include CSRF tokens in headers (backend provides)
 *    
 * 4. SESSION MANAGEMENT:
 *    ✅ DO: Implement session timeout
 *    ✅ DO: Clear storage on logout
 *    ✅ DO: Refresh tokens periodically
 *    
 * 5. XSS PREVENTION:
 *    ✅ DO: Sanitize all user input
 *    ✅ DO: Use Content Security Policy headers
 *    ✅ DO: Escape output in templates
 *    ❌ DON'T: Use innerHTML with user data
 */
