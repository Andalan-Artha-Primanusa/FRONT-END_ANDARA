/**
 * 🔒 Security: Input Sanitization & Validation Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes/escapes dangerous characters and HTML
 */
export const sanitizeInput = (input: string | null | undefined): string => {
  if (!input) return '';
  
  // Convert to string
  const str = String(input).trim();
  
  // Remove control characters and null bytes
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/</g, '&lt;')            // Escape HTML tags
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizes text for safe display (allows basic text only)
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    .trim()
    .substring(0, 10000); // Prevent excessively long strings
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
};

/**
 * Validates URL format
 */
export const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(String(url));
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates numeric input
 */
export const isValidNumber = (value: any): boolean => {
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * Sanitizes JSON string for display (prevents code injection)
 */
export const sanitizeJson = (json: any): string => {
  try {
    const str = typeof json === 'string' ? json : JSON.stringify(json);
    // Remove potential script injections
    return str.replace(/<script>/gi, '&lt;script&gt;')
              .replace(/<\/script>/gi, '&lt;/script&gt;')
              .replace(/on\w+\s*=/gi, '');
  } catch {
    return String(json);
  }
};

/**
 * Validates file upload
 */
export const isValidFileUpload = (
  file: File | null | undefined,
  maxSizeInMB: number = 10,
  allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']
): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  // Check file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeInMB}MB` };
  }

  // Check MIME type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type)) {
    return { valid: false, error: `File type must be one of: ${allowedMimeTypes.join(', ')}` };
  }

  return { valid: true };
};

/**
 * Removes sensitive keys from object before logging/display
 */
export const stripSensitiveData = (obj: any, sensitiveKeys: string[] = ['password', 'token', 'secret', 'apiKey']): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeysLower = sensitiveKeys.map(k => k.toLowerCase());
  
  const stripped: any = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in stripped) {
    if (sensitiveKeysLower.includes(key.toLowerCase())) {
      stripped[key] = '[REDACTED]';
    } else if (typeof stripped[key] === 'object') {
      stripped[key] = stripSensitiveData(stripped[key], sensitiveKeys);
    }
  }
  
  return stripped;
};

/**
 * Rate limit helper - prevents excessive API calls
 */
export class RateLimiter {
  readonly maxRequests: number;
  readonly windowMs: number;
  timestamps: number[] = [];
  
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  isAllowed(): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    // Remove old timestamps outside the window
    this.timestamps = this.timestamps.filter(ts => ts > cutoff);
    
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }
    
    return false;
  }
  
  reset(): void {
    this.timestamps = [];
  }
}
