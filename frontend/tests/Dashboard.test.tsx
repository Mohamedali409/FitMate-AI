import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { CalorieSummaryCard } from '../src/features/dashboard/CalorieSummaryCard';
import { MacroProgressCard } from '../src/features/dashboard/MacroProgressCard';
import { PreviewBanner } from '../src/features/dashboard/PreviewBanner';

describe('Dashboard Visual Components (FE 1)', () => {
  it('should render CalorieSummaryCard with target, consumed, and remaining values', () => {
    render(
      <LanguageProvider>
        <CalorieSummaryCard target={2150} consumed={1680} remaining={470} />
      </LanguageProvider>
    );

    expect(screen.getByText('Daily Calorie Budget')).toBeInTheDocument();
    expect(screen.getByText('2,150')).toBeInTheDocument();
    expect(screen.getByText('1,680')).toBeInTheDocument();
    expect(screen.getByText('470')).toBeInTheDocument();
    expect(screen.getByText(/Estimated/i)).toBeInTheDocument();
  });

  it('should render MacroProgressCard with Protein, Carbs, and Fat breakdown', () => {
    render(
      <LanguageProvider>
        <MacroProgressCard
          proteinTarget={160}
          proteinConsumed={128}
          carbsTarget={215}
          carbsConsumed={172}
          fatTarget={60}
          fatConsumed={48}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Macronutrient Targets')).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Carbohydrates')).toBeInTheDocument();
    expect(screen.getByText('Fats')).toBeInTheDocument();
    expect(screen.getByText('128 / 160 g (80%)')).toBeInTheDocument();
  });

  it('should render PreviewBanner explicitly labeling demo data', () => {
    render(
      <LanguageProvider>
        <PreviewBanner />
      </LanguageProvider>
    );

    expect(screen.getByText('PREVIEW / DEMO MODE')).toBeInTheDocument();
    expect(screen.getByText(/Values shown are realistic estimates/i)).toBeInTheDocument();
  });
});

