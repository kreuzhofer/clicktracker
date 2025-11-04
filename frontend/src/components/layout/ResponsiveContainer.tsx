import React from 'react'
import { Container, ContainerProps } from '@mui/material'
import { SxProps, Theme } from '@mui/material/styles'

interface ResponsiveContainerProps extends ContainerProps {
  children: React.ReactNode
  spacing?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  fullWidth?: boolean
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  spacing = { xs: 2, sm: 3, md: 4 },
  fullWidth = false,
  maxWidth = 'lg',
  sx,
  ...props
}) => {
  const containerSx: SxProps<Theme> = {
    // Mobile-first responsive padding
    px: spacing.xs || 2,
    ...(spacing.sm && {
      '@media (min-width: 768px)': {
        px: spacing.sm,
      },
    }),
    ...(spacing.md && {
      '@media (min-width: 1024px)': {
        px: spacing.md,
      },
    }),
    ...(spacing.lg && {
      '@media (min-width: 1200px)': {
        px: spacing.lg,
      },
    }),
    ...(spacing.xl && {
      '@media (min-width: 1536px)': {
        px: spacing.xl,
      },
    }),
    ...(fullWidth && {
      maxWidth: 'none !important',
      width: '100%',
    }),
    ...sx,
  }

  return (
    <Container maxWidth={maxWidth} sx={containerSx} {...props}>
      {children}
    </Container>
  )
}