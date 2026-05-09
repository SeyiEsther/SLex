import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Royal Blue #162660 — primary actions, navbar, headings
        royal: {
          DEFAULT: '#162660',
          dark: '#0e1b4a',
          light: '#1e318a',
        },
        // Powder Blue #D0E6FD — light accents, hover states, soft backgrounds
        powder: {
          DEFAULT: '#D0E6FD',
          dark: '#b0d0f7',
        },
        // Warm Beige #F1E4D1 — page backgrounds, warm neutral
        beige: {
          DEFAULT: '#F1E4D1',
          dark: '#e8d4bb',
        },
      },
    },
  },
  plugins: [],
}

export default config
