'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FoodCategory } from '../../types/nutrition.types';
import { Search, Filter, X } from 'lucide-react';

interface FoodSearchBoxProps {
  onSearch: (q: string, category?: FoodCategory) => void;
  isLoading?: boolean;
}

const CATEGORIES: Array<{ key: FoodCategory | 'all'; labelEn: string; labelAr: string }> = [
  { key: 'all', labelEn: 'All Categories', labelAr: 'جميع التصنيفات' },
  { key: 'egyptian_dishes', labelEn: 'Egyptian Dishes', labelAr: 'أطباق مصرية' },
  { key: 'middle_eastern', labelEn: 'Middle Eastern', labelAr: 'شرق أوسطية' },
  { key: 'poultry_meat', labelEn: 'Poultry & Meat', labelAr: 'لحوم ودواجن' },
  { key: 'grains_breads', labelEn: 'Grains & Breads', labelAr: 'حبوب ومخبوزات' },
  { key: 'dairy_eggs', labelEn: 'Dairy & Eggs', labelAr: 'ألبان وبيض' },
  { key: 'fruits_vegetables', labelEn: 'Fruits & Veg', labelAr: 'فواكه وخضار' },
  { key: 'legumes_nuts', labelEn: 'Legumes & Nuts', labelAr: 'بقوليات ومكسرات' },
];

export const FoodSearchBox: React.FC<FoodSearchBoxProps> = ({ onSearch, isLoading = false }) => {
  const { t, language } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, selectedCategory === 'all' ? undefined : selectedCategory);
  };

  const handleCategoryClick = (cat: FoodCategory | 'all') => {
    setSelectedCategory(cat);
    onSearch(query, cat === 'all' ? undefined : cat);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('', selectedCategory === 'all' ? undefined : selectedCategory);
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
          />
          <Search className="absolute start-3 top-3 w-4 h-4 text-gray-400" />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear query"
              className="absolute end-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button type="submit" isLoading={isLoading} className="shrink-0">
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">{language === 'ar' ? 'بحث' : 'Search'}</span>
        </Button>
      </form>

      {/* Category Pills (Horizontal Scroll on Mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 me-1" />
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleCategoryClick(cat.key)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition-colors border ${
                isSelected
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-surface-elevated text-gray-600 dark:text-gray-300 border-gray-200 dark:border-surface-border hover:bg-gray-100 dark:hover:bg-surface-border'
              }`}
            >
              {language === 'ar' ? cat.labelAr : cat.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
};

