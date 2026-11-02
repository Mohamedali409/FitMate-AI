import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          DEFAULT: '#0D9488',
        },
        macro: {
          protein: {
            DEFAULT: '#EF4444',
            light: '#FEE2E2',
            dark: '#B91C1C',
          },
          carbs: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
            dark: '#B45309',
          },
          fat: {
            DEFAULT: '#10B981',
            light: '#D1FAE5',
            dark: '#047857',
          },
        },
        surface: {
          background: '#0B0F17',
          card: '#111827',
          elevated: '#1F2937',
          border: '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        arabic: ['Cairo', 'Noto Sans Arabic', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};

export default config;

