import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { Grid, GridItem } from '../Grid'
import { theme } from '../../../theme'

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  )
}

describe('Grid Component', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <Grid>
        <GridItem>
          <div>Test Item 1</div>
        </GridItem>
        <GridItem>
          <div>Test Item 2</div>
        </GridItem>
      </Grid>
    )

    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('Test Item 2')).toBeInTheDocument()
  })

  it('applies responsive columns correctly', () => {
    const { container } = renderWithTheme(
      <Grid columns={{ xs: 1, sm: 2, md: 3 }} data-testid="responsive-grid">
        <GridItem>
          <div>Item</div>
        </GridItem>
      </Grid>
    )

    const gridElement = container.firstChild as HTMLElement
    expect(gridElement).toHaveStyle('display: grid')
  })
})