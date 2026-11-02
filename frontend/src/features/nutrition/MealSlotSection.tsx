'use client';

import React from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MealSlotData, MealSlotName } from '../../types/nutrition.types';
import { Plus, Sun, Sunrise, Sunset, Moon, Coffee } from 'lucide-react';

interface MealSlotSectionProps {
  slots: Record<MealSlotName, MealSlotData>;
  onAddFoodClick: (slot: MealSlotName) => void;
}

export const MealSlotSection: React.FC<MealSlotSectionProps> = ({ slots, onAddFoodClick }) => {
  const { t, language } = useLanguage();

  const slotConfigs: Array<{
    slot: MealSlotName;
    title: string;
    icon: any;
    color: string;
  }> = [
    {
      slot: 'breakfast',
      title: t('nutrition.meals.breakfast'),
      icon: Sunrise,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      slot: 'lunch',
      title: t('nutrition.meals.lunch'),
      icon: Sun,
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40',
    },
    {
      slot: 'dinner',
      title: t('nutrition.meals.dinner'),
      icon: Sunset,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      slot: 'snack',
      title: t('nutrition.meals.snack'),
      icon: Coffee,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40',
    },
  ];

  return (
    <div className="space-y-4">
      {slotConfigs.map((config) => {
        const slotData = slots[config.slot] || {
          slot: config.slot,
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
          items: [],
        };
        const Icon = config.icon;

        return (
          <Card key={config.slot} className="p-4 sm:p-5 border border-gray-200 dark:border-surface-border">
            {/* Slot Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-border">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">{config.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {slotData.calories} {t('dashboard.calories')}
                    </span>
                    <span>•</span>
                    <span className="text-red-500">{slotData.proteinGrams}g P</span>
                    <span>•</span>
                    <span className="text-amber-500">{slotData.carbsGrams}g C</span>
                    <span>•</span>
                    <span className="text-emerald-500">{slotData.fatGrams}g F</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddFoodClick(config.slot)}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('nutrition.addFoodButton')}</span>
              </Button>
            </div>

            {/* Logged Items List */}
            <div className="pt-3">
              {slotData.items.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2 text-center sm:text-start">
                  {t('nutrition.emptySlot')}
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {slotData.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between text-xs text-start"
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {language === 'ar' ? item.nameAr : item.nameEn}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {item.servingWeightGrams}g{' '}
                          {item.unitNameEn ? `• ${language === 'ar' ? item.unitNameAr : item.unitNameEn}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 tabular-nums text-end">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {item.calories} {t('dashboard.calories')}
                        </span>
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500">
                          <span>{item.proteinGrams}P</span>
                          <span>{item.carbsGrams}C</span>
                          <span>{item.fatGrams}F</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

