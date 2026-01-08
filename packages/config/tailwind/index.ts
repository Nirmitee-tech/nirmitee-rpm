import type { Config } from 'tailwindcss';

const tailwindPreset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: '#745EE1',
        'brand-light': '#6d6e87',
        'brand-dark': '#5A48B8',

        // Semantic colors
        success: '#5BCC56',
        'success-dark': '#157B10',
        danger: '#FF4351',
        'danger-dark': '#FF524E',
        warning: '#FFB800',
        info: '#35ADF4',

        // Background colors
        'bg-primary': '#F8F7FC',
        'bg-secondary': '#F4F4F4',
        'bg-tertiary': '#212630',
        'bg-quaternary': '#888888',

        // Text colors
        'text-primary': 'rgba(0,0,0,0.95)',
        'text-secondary': 'rgba(0,0,0,0.60)',
        'text-title': 'rgba(0,0,0,0.80)',

        // Border colors
        'border-primary': '#D7D7D7',
        'border-secondary': '#ffffff1a',
        'border-tertiary': '#B4B3B3',
        'border-brand': '#745EE150',

        // Input colors
        'gray-input': '#212121',
        'light-gray-dark': '#2d2d2f',
      },
      fontFamily: {
        sans: ['var(--font-public-sans)', 'Public Sans', 'sans-serif'],
        brand: ['var(--font-lexend)', 'Lexend', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      fontSize: {
        h1: ['24px', { lineHeight: '1.4', fontWeight: '700' }],
        h2: ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        h4: ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: 'normal', fontWeight: '400' }],
        small: ['12px', { lineHeight: 'normal', fontWeight: '400' }],
        caption: ['10px', { lineHeight: 'normal', fontWeight: '400' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '20px',
      },
      spacing: {
        '4.5': '18px',
        '11': '44px',
      },
      boxShadow: {
        brand: '0px 2px 5px 0px rgba(116, 94, 225, 0.2)',
      },
      accentColor: {
        brand: '#745EE1',
      },
    },
  },
};

export default tailwindPreset;
