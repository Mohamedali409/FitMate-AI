import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { FoodSearchBox } from '../src/features/nutrition/FoodSearchBox';
import { FoodResultCard } from '../src/features/nutrition/FoodResultCard';
import { FoodItemSummary } from '../src/types/nutrition.types';

describe('Nutrition Visual Components (FE 1)', () => {
  it('should trigger search callback on input submit or category click', () => {
    const handleSearch = vi.fn();

    render(
      <LanguageProvider>
        <FoodSearchBox onSearch={handleSearch} />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Search foods/i);
    fireEvent.change(input, { target: { value: 'Koshari' } });
    fireEvent.submit(input.closest('form')!);

    expect(handleSearch).toHaveBeenCalledWith('Koshari', undefined);

    // Click on Egyptian Dishes category pill
    const catBtn = screen.getByText('Egyptian Dishes');
    fireEvent.click(catBtn);

    expect(handleSearch).toHaveBeenCalledWith('Koshari', 'egyptian_dishes');
  });

  it('should render FoodResultCard with bilingual titles and macros', () => {
    const handleSelect = vi.fn();
    const mockFood: FoodItemSummary = {
      id: 'f1',
      catalogId: 'food_eg_koshari_001',
      nameEn: 'Egyptian Koshari',
      nameAr: 'كشري مصري',
      category: 'egyptian_dishes',
      servingSizeGrams: 100,
      caloriesPer100g: 165,
      proteinPer100g: 5.8,
      carbsPer100g: 31.2,
      fatPer100g: 1.8,
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    };

    render(
      <LanguageProvider>
        <FoodResultCard food={mockFood} onSelect={handleSelect} />
      </LanguageProvider>
    );

    expect(screen.getByText('Egyptian Koshari')).toBeInTheDocument();
    expect(screen.getByText('كشري مصري')).toBeInTheDocument();
    expect(screen.getByText('165')).toBeInTheDocument();
    expect(screen.getByText('5.8')).toBeInTheDocument();
    expect(screen.getByText('31.2')).toBeInTheDocument();
    expect(screen.getByText('1.8')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Egyptian Koshari'));
    expect(handleSelect).toHaveBeenCalledWith(mockFood);
  });
});

