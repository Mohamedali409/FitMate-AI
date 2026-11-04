/**
 * FitMate AI — Frontend Security Utilities
 */

/**
 * Validates and sanitizes internal redirect URLs.
 * Mitigates Open Redirect vulnerabilities (SEC-FE-003):
 * - Rejects external URLs (http://, https://, ftp://)
 * - Rejects protocol-relative URLs (//evil.com)
 * - Rejects backslash-based domain bypasses (/\evil.com, \/evil.com, \\evil.com)
 * - Rejects schemes (javascript:, data:)
 * - Rejects CRLF characters
 * Returns a safe relative path starting with '/' or defaultPath.
 */
export function sanitizeRedirectPath(
  redirect: string | null | undefined,
  defaultPath: string = '/dashboard'
): string {
  if (!redirect || typeof redirect !== 'string') {
    return defaultPath;
  }

  const trimmed = redirect.trim();

  // Must begin with a single slash '/'
  if (!trimmed.startsWith('/')) {
    return defaultPath;
  }

  // Reject protocol-relative URLs '//evil.com'
  if (trimmed.startsWith('//')) {
    return defaultPath;
  }

  // Reject backslash bypasses (e.g. '/\evil.com', '\\evil.com')
  if (trimmed.includes('\\')) {
    return defaultPath;
  }

  // Reject URL scheme indicators (e.g. 'javascript:', 'data:', 'https:')
  if (trimmed.includes(':')) {
    return defaultPath;
  }

  // Reject CRLF header injection characters
  if (/[\r\n]/.test(trimmed)) {
    return defaultPath;
  }

  return trimmed;
}

