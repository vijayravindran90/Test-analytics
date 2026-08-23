import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Full shade ramps (50-950) matching the app's original 500/600/700 anchors -
        // sky-500/green-500/amber-500/red-500 are exactly the hex values already in use
        // (#0ea5e9/#22c55e/#f59e0b/#ef4444), so this is additive: it fills in the missing
        // 200/300/400/800/900 shades that many components already referenced but that
        // silently rendered as no-ops under the previous partial palette.
        primary: colors.sky,
        success: colors.green,
        warning: colors.amber,
        danger: colors.red,
      },
    },
  },
  plugins: [],
}
