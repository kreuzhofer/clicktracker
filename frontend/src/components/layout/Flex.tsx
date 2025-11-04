import React from 'react'
import { Box, BoxProps } from '@mui/material'
import { SxProps, Theme } from '@mui/material/styles'

interface FlexProps extends Omit<BoxProps, 'display'> {
  children: React.ReactNode
  direction?: {
    xs?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    sm?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    md?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    lg?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
    xl?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  }
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  gap?: number | string
  rowGap?: number | string
  columnGap?: number | string
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = { xs: 'row' },
  wrap = 'nowrap',
  justify = 'flex-start',
  align = 'stretch',
  gap,
  rowGap,
  columnGap,
  sx,
  ...props
}) => {
  const flexSx: SxProps<Theme> = {
    display: 'flex',
    flexWrap: wrap,
    justifyContent: justify,
    alignItems: align,
    gap: gap,
    rowGap: rowGap,
    columnGap: columnGap,
    // Mobile-first responsive flex direction
    flexDirection: direction.xs || 'row',
    ...(direction.sm && {
      '@media (min-width: 768px)': {
        flexDirection: direction.sm,
      },
    }),
    ...(direction.md && {
      '@media (min-width: 1024px)': {
        flexDirection: direction.md,
      },
    }),
    ...(direction.lg && {
      '@media (min-width: 1200px)': {
        flexDirection: direction.lg,
      },
    }),
    ...(direction.xl && {
      '@media (min-width: 1536px)': {
        flexDirection: direction.xl,
      },
    }),
    ...sx,
  }

  return (
    <Box sx={flexSx} {...props}>
      {children}
    </Box>
  )
}

interface FlexItemProps extends BoxProps {
  children: React.ReactNode
  flex?: {
    xs?: string | number
    sm?: string | number
    md?: string | number
    lg?: string | number
    xl?: string | number
  }
  grow?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  shrink?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  basis?: {
    xs?: string | number
    sm?: string | number
    md?: string | number
    lg?: string | number
    xl?: string | number
  }
}

export const FlexItem: React.FC<FlexItemProps> = ({
  children,
  flex,
  grow,
  shrink,
  basis,
  sx,
  ...props
}) => {
  const itemSx: SxProps<Theme> = {
    // Mobile-first responsive flex properties
    ...(flex?.xs !== undefined && { flex: flex.xs }),
    ...(grow?.xs !== undefined && { flexGrow: grow.xs }),
    ...(shrink?.xs !== undefined && { flexShrink: shrink.xs }),
    ...(basis?.xs !== undefined && { flexBasis: basis.xs }),
    ...(flex?.sm !== undefined && {
      '@media (min-width: 768px)': {
        flex: flex.sm,
      },
    }),
    ...(grow?.sm !== undefined && {
      '@media (min-width: 768px)': {
        flexGrow: grow.sm,
      },
    }),
    ...(shrink?.sm !== undefined && {
      '@media (min-width: 768px)': {
        flexShrink: shrink.sm,
      },
    }),
    ...(basis?.sm !== undefined && {
      '@media (min-width: 768px)': {
        flexBasis: basis.sm,
      },
    }),
    ...(flex?.md !== undefined && {
      '@media (min-width: 1024px)': {
        flex: flex.md,
      },
    }),
    ...(grow?.md !== undefined && {
      '@media (min-width: 1024px)': {
        flexGrow: grow.md,
      },
    }),
    ...(shrink?.md !== undefined && {
      '@media (min-width: 1024px)': {
        flexShrink: shrink.md,
      },
    }),
    ...(basis?.md !== undefined && {
      '@media (min-width: 1024px)': {
        flexBasis: basis.md,
      },
    }),
    ...(flex?.lg !== undefined && {
      '@media (min-width: 1200px)': {
        flex: flex.lg,
      },
    }),
    ...(grow?.lg !== undefined && {
      '@media (min-width: 1200px)': {
        flexGrow: grow.lg,
      },
    }),
    ...(shrink?.lg !== undefined && {
      '@media (min-width: 1200px)': {
        flexShrink: shrink.lg,
      },
    }),
    ...(basis?.lg !== undefined && {
      '@media (min-width: 1200px)': {
        flexBasis: basis.lg,
      },
    }),
    ...(flex?.xl !== undefined && {
      '@media (min-width: 1536px)': {
        flex: flex.xl,
      },
    }),
    ...(grow?.xl !== undefined && {
      '@media (min-width: 1536px)': {
        flexGrow: grow.xl,
      },
    }),
    ...(shrink?.xl !== undefined && {
      '@media (min-width: 1536px)': {
        flexShrink: shrink.xl,
      },
    }),
    ...(basis?.xl !== undefined && {
      '@media (min-width: 1536px)': {
        flexBasis: basis.xl,
      },
    }),
    ...sx,
  }

  return (
    <Box sx={itemSx} {...props}>
      {children}
    </Box>
  )
}