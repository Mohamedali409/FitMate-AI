'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FoodCategory, FOOD_CATEGORIES } from '../../types/nutrition.types';
import { Search, Filter, X } from 'lucide-react';

interface FoodSearchBoxProps {
  onSearch: (q: string, category?: FoodCategory) => void;
  isLoading?: boolean;
  initialQuery?: string;
  initialCategory?: FoodCategory | 'all';
}

const CATEGORY_KEYS: Array<FoodCategory | 'all'> = ['all', ...FOOD_CATEGORIES];

export const FoodSearchBox: React.FC<FoodSearchBoxProps> = ({
  onSearch,
  isLoading = false,
  initialQuery = '',
  initialCategory = 'all',
}) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>(initialCategory);
  const isInitialMount = useRef(true);

  // Debounced search on query change (300ms)
  useEffect(() => {
    // Avoid double search on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onSearch(query, selectedCategory === 'all' ? undefined : selectedCategory);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedCategory, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, selectedCategory === 'all' ? undefined : selectedCategory);
  };

  const handleCategoryClick = (cat: FoodCategory | 'all') => {
    setSelectedCategory(cat);
    // Category click triggers immediate search without waiting for typing debounce
    onSearch(query, cat === 'all' ? undefined : cat);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('', selectedCategory === 'all' ? undefined : selectedCategory);
  };

  const getCategoryLabel = (cat: FoodCategory | 'all'): string => {
    if (cat === 'all') return t('nutrition.allCategories');
    return t(`nutrition.categories.${cat}`);
  };

  return (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('nutrition.searchPlaceholder')}
            className="pe-9 ps-9"
            aria-label={t('nutrition.searchPlaceholder')}
          />
          <Search className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={language === 'ar' ? 'مسح البحث' : 'Clear search query'}
              className="absolute end-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button type="submit" isLoading={isLoading} className="shrink-0" aria-label="Search">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'بحث' : 'Search'}</span>
        </Button>
      </form>

      {/* Category Pills (Horizontal Scroll on Mobile) */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        role="region"
        aria-label={language === 'ar' ? 'تصنيفات الأطعمة' : 'Food categories'}
      >
        <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 me-1" />
        {CATEGORY_KEYS.map((catKey) => {
          const isSelected = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => handleCategoryClick(catKey)}
              aria-pressed={isSelected}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors border ${
                isSelected
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-surface-elevated text-gray-600 dark:text-gray-300 border-gray-200 dark:border-surface-border hover:bg-gray-100 dark:hover:bg-surface-border'
              }`}
            >
              {getCategoryLabel(catKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
