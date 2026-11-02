'use client';

import React, { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../features/auth/AuthContext';
import { Skeleton } from '../ui/Skeleton';

export interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname || '/dashboard')}`;
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-surface-background">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-64 mx-auto rounded-md" />
          <div className="space-y-3 pt-6">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

