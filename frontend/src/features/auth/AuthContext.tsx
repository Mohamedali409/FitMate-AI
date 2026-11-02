'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuthAdapter, AuthApiAdapter } from '../../lib/api/auth.adapter';
import {
  UserSummary,
  UserProfileSnapshot,
  OnboardingFormState,
  AuthResponseData,
} from '../../types/auth.types';

interface AuthContextType {
  user: UserSummary | null;
  profile: UserProfileSnapshot | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMock: boolean;
  login: (email: string, password: string) => Promise<AuthResponseData>;
  register: (data: OnboardingFormState) => Promise<AuthResponseData>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  customAdapter,
}: {
  children: ReactNode;
  customAdapter?: AuthApiAdapter;
}) {
  const adapter = customAdapter || getAuthAdapter();

  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<UserProfileSnapshot | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // In-memory token refresh timer
  useEffect(() => {
    if (!token || !refreshToken) return;

    // Refresh 1 minute before access token expiry (assuming 900s / 15m default)
    const refreshIntervalMs = (900 - 60) * 1000;
    const timer = setTimeout(async () => {
      try {
        const refreshed = await adapter.refresh(refreshToken);
        setToken(refreshed.tokens.accessToken);
        setRefreshToken(refreshed.tokens.refreshToken);
        setUser(refreshed.user);
      } catch (err) {
        console.warn('In-memory token refresh failed:', err);
        // On refresh failure, clear session
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setProfile(null);
      }
    }, refreshIntervalMs);

    return () => clearTimeout(timer);
  }, [token, refreshToken, adapter]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponseData> => {
      setIsLoading(true);
      try {
        const res = await adapter.login(email, password);
        // Strictly store in-memory only (NO localStorage persistence)
        setUser(res.user);
        setProfile(res.profile);
        setToken(res.tokens.accessToken);
        setRefreshToken(res.tokens.refreshToken);
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [adapter]
  );

  const register = useCallback(
    async (data: OnboardingFormState): Promise<AuthResponseData> => {
      setIsLoading(true);
      try {
        const res = await adapter.register(data);
        // Strictly store in-memory only (NO localStorage persistence)
        setUser(res.user);
        setProfile(res.profile);
        setToken(res.tokens.accessToken);
        setRefreshToken(res.tokens.refreshToken);
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [adapter]
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (refreshToken) {
        await adapter.logout(refreshToken);
      }
    } catch (err) {
      console.warn('Backend logout call returned error:', err);
    } finally {
      // Clear all in-memory credentials
      setUser(null);
      setProfile(null);
      setToken(null);
      setRefreshToken(null);
      setIsLoading(false);
    }
  }, [adapter, refreshToken]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;
    try {
      const refreshed = await adapter.refresh(refreshToken);
      setToken(refreshed.tokens.accessToken);
      setRefreshToken(refreshed.tokens.refreshToken);
      setUser(refreshed.user);
      return true;
    } catch {
      setUser(null);
      setProfile(null);
      setToken(null);
      setRefreshToken(null);
      return false;
    }
  }, [adapter, refreshToken]);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        refreshToken,
        isAuthenticated,
        isLoading,
        isMock: adapter.isMock,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
