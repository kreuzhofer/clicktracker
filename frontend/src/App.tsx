import { Routes, Route } from 'react-router-dom'
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material'
import { ResponsiveNavigation, BottomNavigation } from './components/navigation'
import { ResponsiveContainer } from './components/layout'

function App() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
    }}>
      {/* Responsive Navigation */}
      <ResponsiveNavigation />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: { xs: 2, sm: 3, md: 4 },
          pb: isMobile ? 10 : { xs: 2, sm: 3, md: 4 }, // Extra padding for bottom nav on mobile
        }}
      >
        <ResponsiveContainer>
          <Routes>
            <Route path="/" element={
              <Box>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    mb: { xs: 2, sm: 3 },
                  }}
                >
                  Welcome to Campaign Click Tracker
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    lineHeight: 1.6,
                  }}
                >
                  Track your YouTube marketing campaigns with comprehensive analytics and conversion tracking.
                </Typography>
              </Box>
            } />
            <Route path="/campaigns" element={
              <Typography variant="h4" component="h1" gutterBottom>
                Campaigns
              </Typography>
            } />
            <Route path="/links" element={
              <Typography variant="h4" component="h1" gutterBottom>
                Campaign Links
              </Typography>
            } />
            <Route path="/analytics" element={
              <Typography variant="h4" component="h1" gutterBottom>
                Analytics
              </Typography>
            } />
            <Route path="/settings" element={
              <Typography variant="h4" component="h1" gutterBottom>
                Settings
              </Typography>
            } />
            <Route path="/demo" element={
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  Responsive Design Demo
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Current device: {isMobile ? 'Mobile' : 'Desktop'} | 
                  Screen width: {window.innerWidth}px
                </Typography>
              </Box>
            } />
          </Routes>
        </ResponsiveContainer>
      </Box>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </Box>
  )
}

export default App