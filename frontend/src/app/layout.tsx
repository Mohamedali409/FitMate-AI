import type { Metadata, Viewport } from 'next';
import { LanguageProvider } from '../lib/i18n/LanguageContext';
import { AuthProvider } from '../features/auth/AuthContext';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'FitMate AI — Intelligent Fitness & Nutrition Coach',
  description:
    'FitMate AI is a premier mobile fitness and nutrition companion offering personalized workouts, accurate nutrition tracking, and AI coaching.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-slate-50 dark:bg-surface-background text-slate-900 dark:text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
