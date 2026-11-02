import { apiClient } from './client';
import { config } from '../config/env';
import {
  AuthResponseData,
  UserSummary,
  OnboardingFormState,
  RefreshResponseData,
  LogoutResponseData,
} from '../../types/auth.types';

export interface AuthApiAdapter {
  isMock: boolean;
  login(email: string, password: string): Promise<AuthResponseData>;
  register(data: OnboardingFormState): Promise<AuthResponseData>;
  getMe(token: string): Promise<UserSummary>;
  refresh(refreshToken: string): Promise<RefreshResponseData>;
  logout(refreshToken: string): Promise<LogoutResponseData>;
}

export class RealAuthAdapter implements AuthApiAdapter {
  readonly isMock = false;

  async login(email: string, password: string): Promise<AuthResponseData> {
    return apiClient.post<AuthResponseData>('/auth/login', { email, password });
  }

  async register(data: OnboardingFormState): Promise<AuthResponseData> {
    return apiClient.post<AuthResponseData>('/auth/register', {
      email: data.email,
      password: data.password,
      displayName: data.displayName,
      onboarding: {
        goal: data.goal,
        biologicalSex: data.biologicalSex,
        birthDate: data.birthDate,
        heightCm: data.heightCm,
        weightKg: data.weightKg,
        activityMultiplier: data.activityMultiplier,
        trainingExperience: data.trainingExperience,
        dietaryPreference: data.dietaryPreference,
        unitSystem: data.unitSystem,
        preferredLanguage: data.preferredLanguage,
        hasAcceptedHealthDisclaimer: data.hasAcceptedHealthDisclaimer,
        hasAcceptedTerms: data.hasAcceptedTerms,
      },
    });
  }

  async getMe(token: string): Promise<UserSummary> {
    return apiClient.get<UserSummary>('/auth/me', { token });
  }

  async refresh(refreshToken: string): Promise<RefreshResponseData> {
    return apiClient.post<RefreshResponseData>('/auth/refresh', { refreshToken });
  }

  async logout(refreshToken: string): Promise<LogoutResponseData> {
    return apiClient.post<LogoutResponseData>('/auth/logout', { refreshToken });
  }
}

export class MockAuthAdapter implements AuthApiAdapter {
  readonly isMock = true;

  async login(email: string, _password: string): Promise<AuthResponseData> {
    // Simulate brief network latency
    await new Promise((resolve) => setTimeout(resolve, 250));

    return {
      user: {
        id: 'usr_mock_demo_001',
        email: email || 'demo@fitmate.ai',
        displayName: email ? email.split('@')[0] : 'Captain Fit',
        isEmailVerified: true,
        isOnboardingCompleted: true,
      },
      tokens: {
        accessToken: 'mock_jwt_access_token_demo_preview',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'mock_refresh_token_demo_preview',
      },
      profile: {
        goal: 'fat_loss',
        dailyCalorieTarget: 2150,
        proteinTargetGrams: 160.0,
        carbsTargetGrams: 215.0,
        fatTargetGrams: 60.0,
        isEstimated: true,
        unitSystem: 'metric',
        preferredLanguage: 'en',
      },
    };
  }

  async register(data: OnboardingFormState): Promise<AuthResponseData> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      user: {
        id: 'usr_mock_reg_002',
        email: data.email,
        displayName: data.displayName || 'FitMate Athlete',
        isEmailVerified: true,
        isOnboardingCompleted: true,
      },
      tokens: {
        accessToken: 'mock_jwt_access_token_onboarding_preview',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'mock_refresh_token_onboarding_preview',
      },
      profile: {
        goal: data.goal,
        dailyCalorieTarget: 2200,
        proteinTargetGrams: 165.0,
        carbsTargetGrams: 225.0,
        fatTargetGrams: 61.0,
        isEstimated: true,
        unitSystem: data.unitSystem,
        preferredLanguage: data.preferredLanguage,
      },
    };
  }

  async getMe(_token: string): Promise<UserSummary> {
    return {
      id: 'usr_mock_demo_001',
      email: 'demo@fitmate.ai',
      displayName: 'Captain Fit',
      isEmailVerified: true,
      isOnboardingCompleted: true,
    };
  }

  async refresh(_refreshToken: string): Promise<RefreshResponseData> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      user: {
        id: 'usr_mock_demo_001',
        email: 'demo@fitmate.ai',
        displayName: 'Captain Fit',
        isEmailVerified: true,
        isOnboardingCompleted: true,
      },
      tokens: {
        accessToken: 'mock_jwt_access_token_refreshed',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshToken: 'mock_refresh_token_refreshed',
      },
    };
  }

  async logout(_refreshToken: string): Promise<LogoutResponseData> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      message: 'Logged out successfully',
    };
  }
}

export function getAuthAdapter(): AuthApiAdapter {
  return config.useMocks ? new MockAuthAdapter() : new RealAuthAdapter();
}
