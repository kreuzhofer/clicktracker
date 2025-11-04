import { createTheme, Theme } from '@mui/material/styles'
import { breakpoints } from './breakpoints'
import { typography } from './typography'
import { spacing } from './spacing'
import { components } from './components'

declare module '@mui/material/styles' {
  interface Theme {
    customBreakpoints: {
      mobile: string
      tablet: string
      desktop: string
    }
    touchTargets: {
      minimum: number
      comfortable: number
      spacious: number
    }
  }

  interface ThemeOptions {
    customBreakpoints?: {
      mobile: string
      tablet: string
      desktop: string
    }
    touchTargets?: {
      minimum: number
      comfortable: number
      spacious: number
    }
  }
}

export const theme: Theme = createTheme({
  breakpoints,
  typography,
  spacing,
  components,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  customBreakpoints: {
    mobile: '320px',
    tablet: '768px', 
    desktop: '1024px',
  },
  touchTargets: {
    minimum: 44, // 44px minimum touch target
    comfortable: 48, // 48px comfortable touch target
    spacious: 56, // 56px spacious touch target
  },
})

export default theme