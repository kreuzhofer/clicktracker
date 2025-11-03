import { Routes, Route } from 'react-router-dom'
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material'

function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Campaign Click Tracker
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to Campaign Click Tracker
            </Typography>
          } />
        </Routes>
      </Container>
    </Box>
  )
}

export default App