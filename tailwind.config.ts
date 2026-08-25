import type { Config } from 'tailwindcss';

/**
 * The three routes reproduce the original pages verbatim and ship their own
 * complete stylesheets, so Tailwind is not used to style them. It stays wired
 * up (with preflight off, so it cannot reset those pages) for any new UI built
 * alongside them.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};

export default config;
