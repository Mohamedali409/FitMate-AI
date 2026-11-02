import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { OnboardingWizard } from '../src/features/auth/OnboardingWizard';

// Mock Next.js useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/auth/register',
}));

describe('OnboardingWizard (5-Step Registration Flow)', () => {
  it('should render Step 1 by default and navigate to Step 2', () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Goal & Biological Profile')).toBeInTheDocument();

    const nextBtn = screen.getByText('Next Step');
    fireEvent.click(nextBtn);

    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('Physical Measurements')).toBeInTheDocument();
  });

  it('should navigate through all 5 steps up to consents', () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Step 1 -> 2
    fireEvent.click(screen.getByText('Next Step'));
    // Step 2 -> 3
    fireEvent.click(screen.getByText('Next Step'));
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
    // Step 3 -> 4
    fireEvent.click(screen.getByText('Next Step'));
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
    // Step 4 -> 5
    fireEvent.click(screen.getByText('Next Step'));
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    expect(screen.getByText('Review & Consents')).toBeInTheDocument();

    expect(screen.getByText(/Health Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
    expect(screen.getByText('Complete Setup & Enter App')).toBeInTheDocument();
  });
});

