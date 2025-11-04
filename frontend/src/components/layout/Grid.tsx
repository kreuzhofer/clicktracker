import React from 'react'
import { Box, BoxProps } from '@mui/material'
import { SxProps, Theme } from '@mui/material/styles'

interface GridProps extends Omit<BoxProps, 'display'> {
  children: React.ReactNode
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number | string
  rowGap?: number | string
  columnGap?: number | string
  alignItems?: 'start' | 'end' | 'center' | 'stretch'
  justifyContent?: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  autoRows?: string
  autoColumns?: string
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3 },
  gap = 2,
  rowGap,
  columnGap,
  alignItems = 'stretch',
  justifyContent = 'start',
  autoRows = 'auto',
  autoColumns = 'auto',
  sx,
  ...props
}) => {
  const gridSx: SxProps<Theme> = {
    display: 'grid',
    gap: gap,
    rowGap: rowGap,
    columnGap: columnGap,
    alignItems: alignItems,
    justifyContent: justifyContent,
    gridAutoRows: autoRows,
    gridAutoColumns: autoColumns,
    // Mobile-first responsive grid columns
    gridTemplateColumns: `repeat(${columns.xs || 1}, 1fr)`,
    ...(columns.sm && {
      '@media (min-width: 768px)': {
        gridTemplateColumns: `repeat(${columns.sm}, 1fr)`,
      },
    }),
    ...(columns.md && {
      '@media (min-width: 1024px)': {
        gridTemplateColumns: `repeat(${columns.md}, 1fr)`,
      },
    }),
    ...(columns.lg && {
      '@media (min-width: 1200px)': {
        gridTemplateColumns: `repeat(${columns.lg}, 1fr)`,
      },
    }),
    ...(columns.xl && {
      '@media (min-width: 1536px)': {
        gridTemplateColumns: `repeat(${columns.xl}, 1fr)`,
      },
    }),
    ...sx,
  }

  return (
    <Box sx={gridSx} {...props}>
      {children}
    </Box>
  )
}

interface GridItemProps extends BoxProps {
  children: React.ReactNode
  colSpan?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  rowSpan?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export const GridItem: React.FC<GridItemProps> = ({
  children,
  colSpan,
  rowSpan,
  sx,
  ...props
}) => {
  const itemSx: SxProps<Theme> = {
    // Mobile-first responsive column span
    ...(colSpan?.xs && { gridColumn: `span ${colSpan.xs}` }),
    ...(rowSpan?.xs && { gridRow: `span ${rowSpan.xs}` }),
    ...(colSpan?.sm && {
      '@media (min-width: 768px)': {
        gridColumn: `span ${colSpan.sm}`,
      },
    }),
    ...(rowSpan?.sm && {
      '@media (min-width: 768px)': {
        gridRow: `span ${rowSpan.sm}`,
      },
    }),
    ...(colSpan?.md && {
      '@media (min-width: 1024px)': {
        gridColumn: `span ${colSpan.md}`,
      },
    }),
    ...(rowSpan?.md && {
      '@media (min-width: 1024px)': {
        gridRow: `span ${rowSpan.md}`,
      },
    }),
    ...(colSpan?.lg && {
      '@media (min-width: 1200px)': {
        gridColumn: `span ${colSpan.lg}`,
      },
    }),
    ...(rowSpan?.lg && {
      '@media (min-width: 1200px)': {
        gridRow: `span ${rowSpan.lg}`,
      },
    }),
    ...(colSpan?.xl && {
      '@media (min-width: 1536px)': {
        gridColumn: `span ${colSpan.xl}`,
      },
    }),
    ...(rowSpan?.xl && {
      '@media (min-width: 1536px)': {
        gridRow: `span ${rowSpan.xl}`,
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