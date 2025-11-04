import { Components, Theme } from '@mui/material/styles'
import { spacingTokens } from './spacing'

export const components: Components<Omit<Theme, 'components'>> = {
  // Button component with touch-friendly sizing
  MuiButton: {
    styleOverrides: {
      root: {
        minHeight: spacingTokens.touch.minimum,
        padding: `${spacingTokens.component.padding.sm} ${spacingTokens.component.padding.md}`,
        borderRadius: '8px',
        textTransform: 'none',
        fontWeight: 500,
        '@media (max-width: 767px)': {
          minHeight: spacingTokens.touch.comfortable,
          padding: `${spacingTokens.component.padding.md} ${spacingTokens.component.padding.lg}`,
          fontSize: '1.125rem',
        },
      },
      sizeSmall: {
        minHeight: '36px',
        padding: `${spacingTokens.component.padding.xs} ${spacingTokens.component.padding.sm}`,
        '@media (max-width: 767px)': {
          minHeight: spacingTokens.touch.minimum,
          padding: `${spacingTokens.component.padding.sm} ${spacingTokens.component.padding.md}`,
        },
      },
      sizeLarge: {
        minHeight: spacingTokens.touch.spacious,
        padding: `${spacingTokens.component.padding.md} ${spacingTokens.component.padding.xl}`,
        '@media (max-width: 767px)': {
          minHeight: spacingTokens.touch.spacious,
          padding: `${spacingTokens.component.padding.lg} ${spacingTokens.component.padding.xl}`,
        },
      },
    },
  },

  // IconButton with proper touch targets
  MuiIconButton: {
    styleOverrides: {
      root: {
        minWidth: spacingTokens.touch.minimum,
        minHeight: spacingTokens.touch.minimum,
        '@media (max-width: 767px)': {
          minWidth: spacingTokens.touch.comfortable,
          minHeight: spacingTokens.touch.comfortable,
        },
      },
      sizeSmall: {
        minWidth: '36px',
        minHeight: '36px',
        '@media (max-width: 767px)': {
          minWidth: spacingTokens.touch.minimum,
          minHeight: spacingTokens.touch.minimum,
        },
      },
      sizeLarge: {
        minWidth: spacingTokens.touch.spacious,
        minHeight: spacingTokens.touch.spacious,
      },
    },
  },

  // TextField with responsive sizing
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiInputBase-root': {
          minHeight: spacingTokens.touch.minimum,
          '@media (max-width: 767px)': {
            minHeight: spacingTokens.touch.comfortable,
            fontSize: '1rem', // Prevent zoom on iOS
          },
        },
      },
    },
  },

  // Container with responsive padding
  MuiContainer: {
    styleOverrides: {
      root: {
        paddingLeft: spacingTokens.layout.containerPadding.mobile,
        paddingRight: spacingTokens.layout.containerPadding.mobile,
        '@media (min-width: 768px)': {
          paddingLeft: spacingTokens.layout.containerPadding.tablet,
          paddingRight: spacingTokens.layout.containerPadding.tablet,
        },
        '@media (min-width: 1024px)': {
          paddingLeft: spacingTokens.layout.containerPadding.desktop,
          paddingRight: spacingTokens.layout.containerPadding.desktop,
        },
      },
    },
  },

  // Card with responsive spacing
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        },
      },
    },
  },

  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: spacingTokens.component.padding.md,
        '@media (max-width: 767px)': {
          padding: spacingTokens.component.padding.sm,
        },
        '&:last-child': {
          paddingBottom: spacingTokens.component.padding.md,
          '@media (max-width: 767px)': {
            paddingBottom: spacingTokens.component.padding.sm,
          },
        },
      },
    },
  },

  // AppBar with responsive height
  MuiAppBar: {
    styleOverrides: {
      root: {
        minHeight: spacingTokens.touch.spacious,
        '@media (max-width: 767px)': {
          minHeight: spacingTokens.touch.spacious,
        },
      },
    },
  },

  MuiToolbar: {
    styleOverrides: {
      root: {
        minHeight: `${spacingTokens.touch.spacious} !important`,
        paddingLeft: spacingTokens.component.padding.md,
        paddingRight: spacingTokens.component.padding.md,
        '@media (max-width: 767px)': {
          paddingLeft: spacingTokens.component.padding.sm,
          paddingRight: spacingTokens.component.padding.sm,
        },
      },
    },
  },

  // List items with touch-friendly sizing
  MuiListItem: {
    styleOverrides: {
      root: {
        minHeight: spacingTokens.touch.comfortable,
        paddingTop: spacingTokens.component.padding.sm,
        paddingBottom: spacingTokens.component.padding.sm,
      },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: {
        minHeight: spacingTokens.touch.comfortable,
        paddingTop: spacingTokens.component.padding.sm,
        paddingBottom: spacingTokens.component.padding.sm,
        '@media (max-width: 767px)': {
          minHeight: spacingTokens.touch.comfortable,
          paddingTop: spacingTokens.component.padding.md,
          paddingBottom: spacingTokens.component.padding.md,
        },
      },
    },
  },

  // Tab component with touch targets
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: spacingTokens.touch.minimum,
        minWidth: 90,
        '@media (max-width: 767px)': {
          minHeight: spacingTokens.touch.comfortable,
          minWidth: 80,
        },
      },
    },
  },
}