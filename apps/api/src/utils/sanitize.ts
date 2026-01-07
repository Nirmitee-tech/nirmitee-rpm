import DOMPurify from 'isomorphic-dompurify';
import path from 'path';

/**
 * HTML Sanitization - Prevent XSS attacks
 * Uses DOMPurify to strip dangerous HTML/JS while preserving safe content
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip all HTML tags - For plain text fields
 */
export function stripHtml(dirty: string): string {
  if (typeof dirty !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * SQL Injection Prevention
 * Note: Prisma handles parameterization, but this adds extra layer for raw queries
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove SQL keywords and dangerous characters
  return input
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bUNION\b/gi, '') // Remove UNION keyword
    .replace(/\bSELECT\b/gi, '') // Remove SELECT keyword
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bINSERT\b/gi, '') // Remove INSERT keyword
    .replace(/\bUPDATE\b/gi, '') // Remove UPDATE keyword
    .trim();
}

/**
 * Path Traversal Prevention
 * Prevents directory traversal attacks (../, ..\, etc.)
 */
export function sanitizePath(filePath: string): string {
  if (typeof filePath !== 'string') {
    return '';
  }

  // Normalize path and remove any traversal attempts
  const normalized = path.normalize(filePath);

  // Reject paths that try to go up directories
  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid file path: path traversal detected');
  }

  // Remove dangerous characters
  return normalized.replace(/[^a-zA-Z0-9._\-\/]/g, '');
}

/**
 * JSON Injection Prevention
 * Safely parse and validate JSON to prevent injection
 */
export function sanitizeJson<T = any>(input: string): T | null {
  if (typeof input !== 'string') {
    return null;
  }

  try {
    // Remove potential control characters
    const cleaned = input.replace(/[\x00-\x1F\x7F]/g, '');
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Email Sanitization
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  // Convert to lowercase and trim
  const cleaned = email.toLowerCase().trim();

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format');
  }

  return cleaned;
}

/**
 * URL Sanitization
 * Validate and sanitize URLs to prevent javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const cleaned = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = cleaned.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      throw new Error('Invalid URL: dangerous protocol detected');
    }
  }

  // Only allow http, https, mailto
  if (
    !cleaned.startsWith('http://') &&
    !cleaned.startsWith('https://') &&
    !cleaned.startsWith('mailto:') &&
    !cleaned.startsWith('/')
  ) {
    throw new Error('Invalid URL: must use http, https, mailto, or relative path');
  }

  return cleaned;
}

/**
 * Phone Number Sanitization
 * Remove non-digit characters from phone numbers
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  // Keep only digits, +, -, (, ), and spaces
  return phone.replace(/[^0-9+\-() ]/g, '').trim();
}

/**
 * Alphanumeric Sanitization
 * Keep only alphanumeric characters and specified special chars
 */
export function sanitizeAlphanumeric(
  input: string,
  allowedSpecialChars: string = ''
): string {
  if (typeof input !== 'string') {
    return '';
  }

  const pattern = new RegExp(
    `[^a-zA-Z0-9${allowedSpecialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
    'g'
  );

  return input.replace(pattern, '').trim();
}

/**
 * Sanitize object recursively
 * Apply sanitization to all string values in an object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizer: (value: string) => string = stripHtml
): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizer(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item, sanitizer)
          : typeof item === 'string'
          ? sanitizer(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, sanitizer);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Content Security Policy Nonce Generator
 * Generate cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  return require('crypto').randomBytes(16).toString('base64');
}
