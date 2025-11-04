import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import { theme } from './theme'

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('./pwa/registerSW').catch(() => {
    // PWA registration failed, continue without it
    console.log('PWA registration not available')
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
)