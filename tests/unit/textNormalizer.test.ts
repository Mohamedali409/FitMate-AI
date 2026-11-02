import { describe, it, expect } from 'vitest';
import { normalizeText, buildSearchTokens } from '../../src/modules/nutrition/utils/textNormalizer.js';

describe('Text Normalizer Utility (Unit Tests)', () => {
  describe('normalizeText', () => {
    it('should strip Arabic Tashkeel (diacritics) cleanly', () => {
      // Fatha, Damma, Kasra, Shaddah, Sukun, Tanween
      expect(normalizeText('كُشَرِيّ')).toBe('كشري');
      expect(normalizeText('فُولٌ مُدَمَّس')).toBe('فول مدمس');
      expect(normalizeText('طَعْمِيَّةٌ مَصْرِيَّة')).toBe('طعميه مصريه');
      expect(normalizeText('بَيْضٌ مَسْلُوق')).toBe('بيض مسلوق');
    });

    it('should strip Arabic Tatweel (Kashida)', () => {
      expect(normalizeText('كـــــشري')).toBe('كشري');
      expect(normalizeText('فـــول')).toBe('فول');
    });

    it('should normalize all Alef variants to bare Alef (ا)', () => {
      expect(normalizeText('أرز أبيض')).toBe('ارز ابيض');
      expect(normalizeText('إيدام دجاج')).toBe('ايدام دجاج');
      expect(normalizeText('آيس كريم')).toBe('ايس كريم');
      expect(normalizeText('ٱستيك')).toBe('استيك');
    });

    it('should normalize Taa Marbuta (ة) to Haa (ه)', () => {
      expect(normalizeText('جبنة قريش')).toBe('جبنه قريش');
      expect(normalizeText('طعمية')).toBe('طعميه');
      expect(normalizeText('شوربة')).toBe('شوربه');
    });

    it('should normalize Alef Maksura (ى) to Yaa (ي)', () => {
      expect(normalizeText('مربى فراولة')).toBe('مربي فراوله');
      expect(normalizeText('حلوى')).toBe('حلوي');
      expect(normalizeText('مشوى')).toBe('مشوي');
    });

    it('should convert English characters to lowercase', () => {
      expect(normalizeText('CHICKEN BREAST')).toBe('chicken breast');
      expect(normalizeText('Greek Yogurt Low-Fat')).toBe('greek yogurt low-fat');
    });

    it('should trim and collapse multiple whitespace characters', () => {
      expect(normalizeText('   Oatmeal    with   Milk   ')).toBe('oatmeal with milk');
      expect(normalizeText('  فول     بالزيت   ')).toBe('فول بالزيت');
    });

    it('should handle empty or null-like inputs gracefully', () => {
      expect(normalizeText('')).toBe('');
      // @ts-expect-error - testing invalid input defensively
      expect(normalizeText(null)).toBe('');
      // @ts-expect-error - testing invalid input defensively
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('buildSearchTokens', () => {
    it('should extract unique, lowercased, normalized tokens from English, Arabic, and aliases', () => {
      const tokens = buildSearchTokens(
        'Egyptian Koshari',
        'كُشَرِيّ مَصْرِيّ',
        ['Kushari', 'Kosheri', 'كشري']
      );

      expect(tokens).toContain('egyptian');
      expect(tokens).toContain('koshari');
      expect(tokens).toContain('kushari');
      expect(tokens).toContain('kosheri');
      expect(tokens).toContain('كشري');
      expect(tokens).toContain('مصري');

      // Assert no duplicates
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should ignore single-character tokens and punctuation', () => {
      const tokens = buildSearchTokens(
        'Tuna in Water (100g, Grade A)',
        'تونا في الماء',
        ['Tuna & Mayo']
      );

      expect(tokens).toContain('tuna');
      expect(tokens).toContain('water');
      expect(tokens).toContain('100g');
      expect(tokens).toContain('grade');
      expect(tokens).not.toContain('a'); // Single char excluded
      expect(tokens).toContain('تونا');
      expect(tokens).toContain('في');
      expect(tokens).toContain('الماء');
      expect(tokens).toContain('mayo');
    });

    it('should lowercase all tokens so prefix regex works without case-insensitive flag', () => {
      const tokens = buildSearchTokens('Foul Mudammas', 'فول مدمس', ['FOUL']);

      for (const token of tokens) {
        expect(token).toBe(token.toLowerCase());
      }

      // Check that a case-sensitive prefix query /^foul/ matches
      const term = 'foul';
      const matches = tokens.some((t) => t.startsWith(term));
      expect(matches).toBe(true);
    });
  });
});

