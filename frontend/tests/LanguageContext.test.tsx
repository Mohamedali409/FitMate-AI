import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../src/lib/i18n/LanguageContext';

const TestConsumer: React.FC = () => {
  const { language, dir, toggleLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="nav-title">{t('nav.dashboard')}</span>
      <button onClick={toggleLanguage} data-testid="toggle-btn">
        Toggle
      </button>
    </div>
  );
};

describe('LanguageContext Internationalization (Integration)', () => {
  it('should initialize with English LTR by default', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(screen.getByTestId('nav-title').textContent).toBe('Dashboard');
  });

  it('should toggle to Arabic RTL and update document direction', () => {
    render(
      <LanguageProvider>
        <TestConsumer />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByTestId('toggle-btn');
    act(() => {
      toggleBtn.click();
    });

    expect(screen.getByTestId('lang').textContent).toBe('ar');
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(screen.getByTestId('nav-title').textContent).toBe('لوحة التحكم');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });
});

