import { BreakpointsOptions } from '@mui/material/styles'

export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,      // Mobile devices (320px+)
    sm: 768,    // Tablet devices (768px+)
    md: 1024,   // Desktop devices (1024px+)
    lg: 1200,   // Large desktop (1200px+)
    xl: 1536,   // Extra large desktop (1536px+)
  },
}

// Custom breakpoint utilities for responsive design
export const mediaQueries = {
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
  mobileAndTablet: '@media (max-width: 1023px)',
  tabletAndDesktop: '@media (min-width: 768px)',
}

// Responsive helper functions
export const responsive = {
  mobile: (styles: any) => ({
    [mediaQueries.mobile]: styles,
  }),
  tablet: (styles: any) => ({
    [mediaQueries.tablet]: styles,
  }),
  desktop: (styles: any) => ({
    [mediaQueries.desktop]: styles,
  }),
  mobileAndTablet: (styles: any) => ({
    [mediaQueries.mobileAndTablet]: styles,
  }),
  tabletAndDesktop: (styles: any) => ({
    [mediaQueries.tabletAndDesktop]: styles,
  }),
}