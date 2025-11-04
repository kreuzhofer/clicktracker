// PWA Service Worker Registration
export let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

// Basic service worker registration without PWA plugin virtual modules
if ('serviceWorker' in navigator) {
  // Register service worker manually
  navigator.serviceWorker.register('/sw.js')
    .then((registration) => {
      console.log('SW registered: ', registration)
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              if (confirm('New content available. Reload?')) {
                window.location.reload()
              }
            }
          })
        }
      })
      
      // Create a simple update function
      updateSW = async (reloadPage = false) => {
        if (reloadPage) {
          window.location.reload()
        } else {
          // Check for updates
          registration.update()
        }
      }
      
      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60000) // Check every minute
      
    })
    .catch((registrationError) => {
      console.log('SW registration failed: ', registrationError)
    })
}