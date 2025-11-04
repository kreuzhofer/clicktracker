// Responsive spacing system based on 8px grid
export const spacing = (factor: number) => `${8 * factor}px`

// Design tokens for consistent spacing
export const spacingTokens = {
  // Base spacing units
  xs: spacing(0.5),   // 4px
  sm: spacing(1),     // 8px
  md: spacing(2),     // 16px
  lg: spacing(3),     // 24px
  xl: spacing(4),     // 32px
  xxl: spacing(6),    // 48px
  
  // Component-specific spacing
  component: {
    padding: {
      xs: spacing(1),   // 8px - tight padding
      sm: spacing(2),   // 16px - normal padding
      md: spacing(3),   // 24px - comfortable padding
      lg: spacing(4),   // 32px - spacious padding
      xl: spacing(5),   // 40px - extra spacious padding
    },
    margin: {
      xs: spacing(1),   // 8px
      sm: spacing(2),   // 16px
      md: spacing(3),   // 24px
      lg: spacing(4),   // 32px
    },
    gap: {
      xs: spacing(1),   // 8px - tight gap
      sm: spacing(2),   // 16px - normal gap
      md: spacing(3),   // 24px - comfortable gap
      lg: spacing(4),   // 32px - spacious gap
    },
  },
  
  // Layout spacing
  layout: {
    containerPadding: {
      mobile: spacing(2),    // 16px
      tablet: spacing(3),    // 24px
      desktop: spacing(4),   // 32px
    },
    sectionSpacing: {
      mobile: spacing(4),    // 32px
      tablet: spacing(6),    // 48px
      desktop: spacing(8),   // 64px
    },
  },
  
  // Touch targets and interactive elements
  touch: {
    minimum: 44,      // 44px minimum touch target
    comfortable: 48,  // 48px comfortable touch target
    spacious: 56,     // 56px spacious touch target
  },
}