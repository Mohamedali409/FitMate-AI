'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { getAuthAdapter, AuthApiAdapter } from '../../lib/api/auth.adapter';
import { setTokenRefreshHandler, setAccessTokenProvider } from '../../lib/api/client';
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

  // Synchronized refs for token refresh handler without stale closures
  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  tokenRef.current = token;
  refreshTokenRef.current = refreshToken;

  // SEC-FE-001: Pure refresh session function with real backend contract shape
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = refreshTokenRef.current;
    if (!currentRefreshToken) return false;
    try {
      const refreshed = await adapter.refresh(currentRefreshToken);
      setToken(refreshed.accessToken);
      setRefreshToken(refreshed.refreshToken);
      tokenRef.current = refreshed.accessToken;
      refreshTokenRef.current = refreshed.refreshToken;
      return true;
    } catch {
      setUser(null);
      setProfile(null);
      setToken(null);
      setRefreshToken(null);
      tokenRef.current = null;
      refreshTokenRef.current = null;
      return false;
    }
  }, [adapter]);

  // SEC-FE-006: Register ApiClient 401 recovery handler & access token provider
  useEffect(() => {
    setTokenRefreshHandler(async () => {
      const success = await refreshSession();
      if (success) {
        return tokenRef.current;
      }
      return null;
    });

    setAccessTokenProvider(() => tokenRef.current);

    return () => {
      setTokenRefreshHandler(null);
      setAccessTokenProvider(null);
    };
  }, [refreshSession]);

  // In-memory proactive token refresh timer (14 minutes on 15m access token)
  useEffect(() => {
    if (!token || !refreshToken) return;

    const refreshIntervalMs = (900 - 60) * 1000;
    const timer = setTimeout(async () => {
      try {
        await refreshSession();
      } catch (err) {
        console.warn('In-memory token refresh failed:', err);
      }
    }, refreshIntervalMs);

    return () => clearTimeout(timer);
  }, [token, refreshToken, refreshSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponseData> => {
      setIsLoading(true);
      try {
        const res = await adapter.login(email, password);
        // Strictly store in-memory only (NO localStorage persistence)
        setUser(res.user);
        setToken(res.tokens.accessToken);
        setRefreshToken(res.tokens.refreshToken);
        tokenRef.current = res.tokens.accessToken;
        refreshTokenRef.current = res.tokens.refreshToken;

        // SEC-FE-002: Hydrate profile targets if not present in login response
        if (res.profile) {
          setProfile(res.profile);
        } else {
          try {
            const userProfile = await adapter.getProfile(res.tokens.accessToken);
            setProfile(userProfile);
          } catch (profileErr) {
            console.warn('Profile hydration failed after login:', profileErr);
            // Profile failure does not invalidate active session
            setProfile(null);
          }
        }

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
        setUser(res.user);
        setProfile(res.profile || null);
        setToken(res.tokens.accessToken);
        setRefreshToken(res.tokens.refreshToken);
        tokenRef.current = res.tokens.accessToken;
        refreshTokenRef.current = res.tokens.refreshToken;
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
      const currentRefreshToken = refreshTokenRef.current;
      if (currentRefreshToken) {
        await adapter.logout(currentRefreshToken);
      }
    } catch (err) {
      console.warn('Backend logout call returned error:', err);
    } finally {
      // Clear all in-memory credentials
      setUser(null);
      setProfile(null);
      setToken(null);
      setRefreshToken(null);
      tokenRef.current = null;
      refreshTokenRef.current = null;
      setIsLoading(false);
    }
  }, [adapter]);

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
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
