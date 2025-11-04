import { Theme } from '@mui/material/styles'

// Responsive utility functions for consistent breakpoint usage
export const responsive = {
  // Hide/show elements based on screen size
  hideOnMobile: {
    display: { xs: 'none', sm: 'block' },
  },
  hideOnDesktop: {
    display: { xs: 'block', sm: 'none' },
  },
  showOnTabletUp: {
    display: { xs: 'none', md: 'block' },
  },
  
  // Common responsive spacing patterns
  spacing: {
    // Responsive padding
    paddingResponsive: (xs: number, sm?: number, md?: number) => ({
      p: xs,
      ...(sm && { '@media (min-width: 768px)': { p: sm } }),
      ...(md && { '@media (min-width: 1024px)': { p: md } }),
    }),
    
    // Responsive margin
    marginResponsive: (xs: number, sm?: number, md?: number) => ({
      m: xs,
      ...(sm && { '@media (min-width: 768px)': { m: sm } }),
      ...(md && { '@media (min-width: 1024px)': { m: md } }),
    }),
    
    // Responsive gap
    gapResponsive: (xs: number, sm?: number, md?: number) => ({
      gap: xs,
      ...(sm && { '@media (min-width: 768px)': { gap: sm } }),
      ...(md && { '@media (min-width: 1024px)': { gap: md } }),
    }),
  },
  
  // Typography responsive patterns
  typography: {
    // Responsive font size
    fontSizeResponsive: (xs: string, sm?: string, md?: string) => ({
      fontSize: xs,
      ...(sm && { '@media (min-width: 768px)': { fontSize: sm } }),
      ...(md && { '@media (min-width: 1024px)': { fontSize: md } }),
    }),
    
    // Responsive line height
    lineHeightResponsive: (xs: number, sm?: number, md?: number) => ({
      lineHeight: xs,
      ...(sm && { '@media (min-width: 768px)': { lineHeight: sm } }),
      ...(md && { '@media (min-width: 1024px)': { lineHeight: md } }),
    }),
  },
  
  // Layout responsive patterns
  layout: {
    // Responsive flex direction
    flexDirectionResponsive: (
      xs: 'row' | 'column' | 'row-reverse' | 'column-reverse',
      sm?: 'row' | 'column' | 'row-reverse' | 'column-reverse',
      md?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    ) => ({
      flexDirection: xs,
      ...(sm && { '@media (min-width: 768px)': { flexDirection: sm } }),
      ...(md && { '@media (min-width: 1024px)': { flexDirection: md } }),
    }),
    
    // Responsive grid columns
    gridColumnsResponsive: (xs: number, sm?: number, md?: number) => ({
      gridTemplateColumns: `repeat(${xs}, 1fr)`,
      ...(sm && { '@media (min-width: 768px)': { gridTemplateColumns: `repeat(${sm}, 1fr)` } }),
      ...(md && { '@media (min-width: 1024px)': { gridTemplateColumns: `repeat(${md}, 1fr)` } }),
    }),
    
    // Responsive width
    widthResponsive: (xs: string | number, sm?: string | number, md?: string | number) => ({
      width: xs,
      ...(sm && { '@media (min-width: 768px)': { width: sm } }),
      ...(md && { '@media (min-width: 1024px)': { width: md } }),
    }),
    
    // Responsive height
    heightResponsive: (xs: string | number, sm?: string | number, md?: string | number) => ({
      height: xs,
      ...(sm && { '@media (min-width: 768px)': { height: sm } }),
      ...(md && { '@media (min-width: 1024px)': { height: md } }),
    }),
  },
  
  // Touch target helpers
  touchTarget: {
    minimum: {
      minWidth: 44,
      minHeight: 44,
    },
    comfortable: {
      minWidth: 48,
      minHeight: 48,
    },
    spacious: {
      minWidth: 56,
      minHeight: 56,
    },
  },
}

// Breakpoint helper functions
export const breakpoints = {
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
  mobileAndTablet: '@media (max-width: 1023px)',
  tabletAndDesktop: '@media (min-width: 768px)',
}

// Device detection utilities
export const device = {
  isMobile: (theme: Theme) => theme.breakpoints.down('sm'),
  isTablet: (theme: Theme) => theme.breakpoints.between('sm', 'md'),
  isDesktop: (theme: Theme) => theme.breakpoints.up('md'),
  isTouchDevice: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
}

// Common responsive component patterns
export const componentPatterns = {
  // Card layout that stacks on mobile, side-by-side on desktop
  cardLayout: {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    gap: { xs: 2, md: 3 },
  },
  
  // Form layout that's single column on mobile, multi-column on desktop
  formLayout: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
    gap: { xs: 2, md: 3 },
  },
  
  // Button group that stacks on mobile, inline on desktop
  buttonGroup: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: { xs: 1, sm: 2 },
    alignItems: { xs: 'stretch', sm: 'center' },
  },
  
  // Navigation that's drawer on mobile, horizontal on desktop
  navigation: {
    display: { xs: 'none', md: 'flex' },
    alignItems: 'center',
    gap: 2,
  },
}