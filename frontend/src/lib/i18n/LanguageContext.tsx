'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Locale } from './translations';
import { config } from '../config/env';

interface LanguageContextType {
  language: Locale;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: Locale) => void;
  toggleLanguage: () => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Locale>(config.defaultLanguage);

  useEffect(() => {
    // Read from localStorage on client mount if available
    const saved = localStorage.getItem('fitmate_lang') as Locale | null;
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLanguageState(saved);
    }
  }, []);

  const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
    }
  }, [language, dir]);

  const setLanguage = (newLang: Locale) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('fitmate_lang', newLang);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to English if key missing in current language
        let fallback: any = translations.en;
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return keyPath; // Return key path if not found anywhere
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return keyPath;
    }

    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, current);
    }

    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, dir, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

