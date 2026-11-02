/**
 * FitMate AI — Frontend Environment Configuration
 */

/**
 * Pure function determining whether to use mock adapters.
 * Satisfies AUD-FE-001:
 * - In production (NODE_ENV === 'production'): Defaults to false (OFF) unless explicitly set to 'true'.
 * - In development/test: Defaults to true (preview mode) unless explicitly set to 'false'.
 */
export function shouldUseMocks(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  envUseMocks: string | undefined = process.env.NEXT_PUBLIC_USE_MOCKS
): boolean {
  const normalized = envUseMocks?.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;

  // If unspecified:
  if (nodeEnv === 'production') {
    return false; // Strictly OFF in production by default
  }
  return true; // Default ON in local development / preview
}

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  useMocks: shouldUseMocks(),
  defaultLanguage: (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en') as 'en' | 'ar',
  defaultUnitSystem: (process.env.NEXT_PUBLIC_DEFAULT_UNIT_SYSTEM || 'metric') as 'metric' | 'imperial',
};
