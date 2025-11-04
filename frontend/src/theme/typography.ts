import { TypographyOptions } from '@mui/material/styles/createTypography'

export const typography: TypographyOptions = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(','),
  
  // Responsive typography scale
  h1: {
    fontSize: '2rem',      // 32px
    fontWeight: 700,
    lineHeight: 1.2,
    '@media (min-width: 768px)': {
      fontSize: '2.5rem',  // 40px
    },
    '@media (min-width: 1024px)': {
      fontSize: '3rem',    // 48px
    },
  },
  
  h2: {
    fontSize: '1.75rem',   // 28px
    fontWeight: 600,
    lineHeight: 1.3,
    '@media (min-width: 768px)': {
      fontSize: '2rem',    // 32px
    },
    '@media (min-width: 1024px)': {
      fontSize: '2.25rem', // 36px
    },
  },
  
  h3: {
    fontSize: '1.5rem',    // 24px
    fontWeight: 600,
    lineHeight: 1.4,
    '@media (min-width: 768px)': {
      fontSize: '1.75rem', // 28px
    },
  },
  
  h4: {
    fontSize: '1.25rem',   // 20px
    fontWeight: 600,
    lineHeight: 1.4,
    '@media (min-width: 768px)': {
      fontSize: '1.5rem',  // 24px
    },
  },
  
  h5: {
    fontSize: '1.125rem',  // 18px
    fontWeight: 600,
    lineHeight: 1.5,
    '@media (min-width: 768px)': {
      fontSize: '1.25rem', // 20px
    },
  },
  
  h6: {
    fontSize: '1rem',      // 16px
    fontWeight: 600,
    lineHeight: 1.5,
    '@media (min-width: 768px)': {
      fontSize: '1.125rem', // 18px
    },
  },
  
  body1: {
    fontSize: '1rem',      // 16px
    fontWeight: 400,
    lineHeight: 1.6,
  },
  
  body2: {
    fontSize: '0.875rem',  // 14px
    fontWeight: 400,
    lineHeight: 1.6,
  },
  
  button: {
    fontSize: '1rem',      // 16px - larger for touch
    fontWeight: 500,
    textTransform: 'none',
    '@media (max-width: 767px)': {
      fontSize: '1.125rem', // 18px - even larger on mobile
    },
  },
  
  caption: {
    fontSize: '0.75rem',   // 12px
    fontWeight: 400,
    lineHeight: 1.4,
  },
  
  overline: {
    fontSize: '0.75rem',   // 12px
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
}

// Typography design tokens
export const typographyTokens = {
  // Font sizes with responsive scaling
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
  },
  
  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Letter spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
}