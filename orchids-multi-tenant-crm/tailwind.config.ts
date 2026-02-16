import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Rhône Risk brand colors
        rhone: {
          navy: '#162B4D',
          cyan: '#0CBDDB',
          slate: '#334155',
          light: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
}
export default config
