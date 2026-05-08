import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f172a',
          card:    '#1e293b',
          muted:   '#0f172a',
          border:  '#1e293b',
        },
      },
      fontFamily: {
        sans: [
          'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont',
          'Segoe UI', 'sans-serif',
        ],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.zinc.300'),
            '--tw-prose-headings': theme('colors.white'),
            '--tw-prose-lead': theme('colors.zinc.300'),
            '--tw-prose-links': theme('colors.white'),
            '--tw-prose-bold': theme('colors.white'),
            '--tw-prose-counters': theme('colors.zinc.400'),
            '--tw-prose-bullets': theme('colors.zinc.500'),
            '--tw-prose-hr': theme('colors.zinc.700'),
            '--tw-prose-quotes': theme('colors.zinc.200'),
            '--tw-prose-quote-borders': theme('colors.zinc.600'),
            '--tw-prose-captions': theme('colors.zinc.400'),
            '--tw-prose-code': theme('colors.white'),
            '--tw-prose-pre-code': theme('colors.zinc.200'),
            '--tw-prose-pre-bg': theme('colors.zinc.900'),
            '--tw-prose-th-borders': theme('colors.zinc.700'),
            '--tw-prose-td-borders': theme('colors.zinc.800'),
            maxWidth: 'none',
            h2: {
              fontSize: '1.375rem',
              fontWeight: '700',
              marginTop: '2rem',
              marginBottom: '0.75rem',
              color: theme('colors.white'),
            },
            h3: {
              fontSize: '1.125rem',
              fontWeight: '600',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
              color: theme('colors.white'),
            },
            h4: {
              fontWeight: '600',
              color: theme('colors.zinc.200'),
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              backgroundColor: theme('colors.zinc.800'),
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
              color: theme('colors.zinc.200'),
            },
            table: {
              fontSize: '0.9em',
            },
            thead: {
              borderBottomColor: theme('colors.zinc.700'),
            },
            'thead th': {
              color: theme('colors.zinc.300'),
              fontWeight: '600',
            },
            'tbody tr': {
              borderBottomColor: theme('colors.zinc.800'),
            },
            'tbody td': {
              color: theme('colors.zinc.300'),
            },
            blockquote: {
              borderLeftColor: theme('colors.zinc.600'),
              color: theme('colors.zinc.300'),
              fontStyle: 'normal',
              backgroundColor: theme('colors.zinc.900'),
              padding: '0.75rem 1rem',
              borderRadius: '0 0.5rem 0.5rem 0',
            },
            'blockquote p:first-of-type::before': { content: '""' },
            'blockquote p:last-of-type::after': { content: '""' },
            hr: {
              borderColor: theme('colors.zinc.800'),
            },
            strong: {
              color: theme('colors.white'),
              fontWeight: '600',
            },
            li: {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            'ul > li::marker': {
              color: theme('colors.zinc.500'),
            },
            'ol > li::marker': {
              color: theme('colors.zinc.400'),
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};
