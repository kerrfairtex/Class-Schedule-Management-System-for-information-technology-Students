import type { Config } from 'tailwindcss';

/**
 * TRAC BSIT design tokens.
 *
 * A light, calm palette drawn from Tawi-Tawi: the lagoon around Bongao for
 * the primary colour, seagrass green for the agricultural college, sand for
 * "now / today" highlights. Contrast on white: lagoon 6.1:1, ink 14:1,
 * muted 5.3:1 (WCAG AA for body text).
 */
const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F4F7F6', 2: '#EAF0EE' },
        surface: '#FFFFFF',
        ink: { DEFAULT: '#0F2A2E', soft: '#2F4649' },
        muted: '#566A6D',
        line: { DEFAULT: '#D5E0DD', strong: '#A9BBB7' },
        lagoon: { DEFAULT: '#0B6B70', dark: '#08555A', light: '#3C8E92', 50: '#E3F1F1' },
        seagrass: { DEFAULT: '#3D7A3A', 50: '#E6F1E4' },
        sand: { DEFAULT: '#F1E6C8', dark: '#B39144' },
        coral: { DEFAULT: '#B3412C', 50: '#F8E7E3' },
        // `primary` kept as an alias so older class names follow the palette.
        primary: { DEFAULT: '#0B6B70', dark: '#08555A', light: '#3C8E92' },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
};

export default config;
