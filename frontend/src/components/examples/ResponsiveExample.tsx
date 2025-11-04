import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { Grid, GridItem, Flex, FlexItem } from '../layout'
// import { responsive } from '../../utils/responsive'

export const ResponsiveExample: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom>
        Responsive Design System Demo
      </Typography>

      {/* Responsive Grid Example */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Responsive Grid Layout
        </Typography>
        <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap={2}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <GridItem key={item}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Card {item}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    This card adapts to different screen sizes using the responsive grid system.
                  </Typography>
                </CardContent>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </Box>

      {/* Responsive Flex Example */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Responsive Flex Layout
        </Typography>
        <Flex
          direction={{ xs: 'column', md: 'row' }}
          gap={2}
          align="stretch"
        >
          <FlexItem flex={{ xs: '1', md: '2' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">Main Content</Typography>
                <Typography variant="body2">
                  This section takes up more space on desktop but stacks on mobile.
                </Typography>
              </CardContent>
            </Card>
          </FlexItem>
          <FlexItem flex={{ xs: '1', md: '1' }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6">Sidebar</Typography>
                <Typography variant="body2">
                  This sidebar stacks below on mobile.
                </Typography>
              </CardContent>
            </Card>
          </FlexItem>
        </Flex>
      </Box>

      {/* Touch Target Examples */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Touch-Friendly Components
        </Typography>
        <Flex direction={{ xs: 'column', sm: 'row' }} gap={2} wrap="wrap">
          <Button variant="contained" size="small">
            Small Button
          </Button>
          <Button variant="contained">
            Normal Button
          </Button>
          <Button variant="contained" size="large">
            Large Button
          </Button>
        </Flex>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Buttons automatically adjust size for touch devices. 
            Current device: {isMobile ? 'Mobile' : 'Desktop'}
          </Typography>
        </Box>
      </Box>

      {/* Responsive Form Example */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Responsive Form Layout
        </Typography>
        <Card>
          <CardContent>
            <Grid columns={{ xs: 1, md: 2 }} gap={2}>
              <GridItem>
                <TextField
                  fullWidth
                  label="First Name"
                  variant="outlined"
                />
              </GridItem>
              <GridItem>
                <TextField
                  fullWidth
                  label="Last Name"
                  variant="outlined"
                />
              </GridItem>
              <GridItem colSpan={{ xs: 1, md: 2 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  variant="outlined"
                />
              </GridItem>
              <GridItem colSpan={{ xs: 1, md: 2 }}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  variant="outlined"
                />
              </GridItem>
            </Grid>
            
            <Flex 
              direction={{ xs: 'column', sm: 'row' }} 
              justify="flex-end" 
              gap={2}
              sx={{ mt: 3 }}
            >
              <Button variant="outlined">
                Cancel
              </Button>
              <Button variant="contained">
                Submit
              </Button>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Responsive Typography */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Responsive Typography
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h1" gutterBottom>
              Heading 1 - Scales with screen size
            </Typography>
            <Typography variant="h2" gutterBottom>
              Heading 2 - Also responsive
            </Typography>
            <Typography variant="body1" paragraph>
              Body text maintains readability across all devices with appropriate 
              line heights and font sizes that adapt to the screen size.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip label="Mobile Optimized" color="primary" sx={{ mr: 1 }} />
              <Chip label="Touch Friendly" color="secondary" sx={{ mr: 1 }} />
              <Chip label="Accessible" color="success" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Device Information */}
      <Box>
        <Typography variant="h5" gutterBottom>
          Current Device Information
        </Typography>
        <Card>
          <CardContent>
            <Grid columns={{ xs: 1, sm: 2 }} gap={2}>
              <GridItem>
                <Typography variant="body2">
                  <strong>Screen Size:</strong> {isMobile ? 'Mobile' : 'Desktop'}
                </Typography>
              </GridItem>
              <GridItem>
                <Typography variant="body2">
                  <strong>Touch Device:</strong> {'ontouchstart' in window ? 'Yes' : 'No'}
                </Typography>
              </GridItem>
              <GridItem>
                <Typography variant="body2">
                  <strong>Viewport Width:</strong> {window.innerWidth}px
                </Typography>
              </GridItem>
              <GridItem>
                <Typography variant="body2">
                  <strong>Viewport Height:</strong> {window.innerHeight}px
                </Typography>
              </GridItem>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}