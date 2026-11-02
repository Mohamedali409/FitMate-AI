import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { OnboardingWizard } from '../src/features/auth/OnboardingWizard';
import { MockAuthAdapter } from '../src/lib/api/auth.adapter';
import { ApiClientError } from '../src/lib/api/client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/auth/register',
}));

describe('Registration & Onboarding Integration (5-Step Validation & Submission)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates Step 1: rejects birthDate under 13 years old', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Set birthDate to 5 years ago
    const birthDateInput = screen.getByLabelText(/Date of Birth/i);
    const recentDate = new Date();
    recentDate.setFullYear(recentDate.getFullYear() - 5);
    fireEvent.change(birthDateInput, { target: { value: recentDate.toISOString().split('T')[0] } });

    fireEvent.click(screen.getByText('Next Step'));

    // Should stay on Step 1 and display error (in alert banner and/or field error)
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getAllByText(/User must be between 13 and 100 years of age/i).length).toBeGreaterThan(0);
  });

  it('validates Step 2: rejects height outside 100 - 250 cm', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Step 1 -> Step 2 (valid birthDate by default)
    fireEvent.click(screen.getByText('Next Step'));
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();

    const heightInput = screen.getByLabelText(/Height/i);
    fireEvent.change(heightInput, { target: { value: '90' } }); // below 100 cm

    fireEvent.click(screen.getByText('Next Step'));

    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getAllByText(/Height must be between 100\.0 and 250\.0 cm/i).length).toBeGreaterThan(0);
  });

  it('validates Step 2: rejects weight outside 30 - 300 kg', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Next Step'));
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();

    const weightInput = screen.getByLabelText(/Weight/i);
    fireEvent.change(weightInput, { target: { value: '25' } }); // below 30 kg

    fireEvent.click(screen.getByText('Next Step'));

    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getAllByText(/Weight must be between 30\.0 and 300\.0 kg/i).length).toBeGreaterThan(0);
  });

  it('validates Step 5: rejects password without complexity requirements', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Advance to Step 5
    fireEvent.click(screen.getByText('Next Step')); // 1 -> 2
    fireEvent.click(screen.getByText('Next Step')); // 2 -> 3
    fireEvent.click(screen.getByText('Next Step')); // 3 -> 4
    fireEvent.click(screen.getByText('Next Step')); // 4 -> 5
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();

    // Set weak password
    const passwordInput = screen.getByLabelText(/^Password$/i);
    fireEvent.change(passwordInput, { target: { value: 'weakpass' } });

    fireEvent.click(screen.getByText('Complete Setup & Enter App'));

    expect(screen.getAllByText(/Password must contain at least 8 characters/i).length).toBeGreaterThan(0);
  });

  it('validates Step 5: requires health disclaimer and terms acceptance', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Advance to Step 5
    fireEvent.click(screen.getByText('Next Step')); // 1 -> 2
    fireEvent.click(screen.getByText('Next Step')); // 2 -> 3
    fireEvent.click(screen.getByText('Next Step')); // 3 -> 4
    fireEvent.click(screen.getByText('Next Step')); // 4 -> 5

    // Uncheck health disclaimer
    const checkboxes = screen.getAllByRole('checkbox');
    const disclaimerCheckbox = checkboxes[0]; // First checkbox is health disclaimer
    fireEvent.click(disclaimerCheckbox);

    fireEvent.click(screen.getByText('Complete Setup & Enter App'));

    expect(screen.getAllByText(/Health disclaimer acceptance is mandatory/i).length).toBeGreaterThan(0);
  });

  it('submits registration successfully and redirects to /dashboard', async () => {
    render(
      <AuthProvider>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Advance to Step 5 with default valid data
    fireEvent.click(screen.getByText('Next Step')); // 1 -> 2
    fireEvent.click(screen.getByText('Next Step')); // 2 -> 3
    fireEvent.click(screen.getByText('Next Step')); // 3 -> 4
    fireEvent.click(screen.getByText('Next Step')); // 4 -> 5

    const submitBtn = screen.getByText('Complete Setup & Enter App');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 2000 });
  });

  it('displays backend error message cleanly when registration fails with EMAIL_ALREADY_EXISTS', async () => {
    const failingAdapter = new MockAuthAdapter();
    failingAdapter.register = vi.fn().mockRejectedValue(
      new ApiClientError(409, {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists.',
      })
    );

    render(
      <AuthProvider customAdapter={failingAdapter}>
        <LanguageProvider>
          <OnboardingWizard />
        </LanguageProvider>
      </AuthProvider>
    );

    // Advance to Step 5
    fireEvent.click(screen.getByText('Next Step'));
    fireEvent.click(screen.getByText('Next Step'));
    fireEvent.click(screen.getByText('Next Step'));
    fireEvent.click(screen.getByText('Next Step'));

    const submitBtn = screen.getByText('Complete Setup & Enter App');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/This email is already registered. Please sign in instead/i)).toBeInTheDocument();
    });
  });
});
