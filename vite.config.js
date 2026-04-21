import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Listen on every network interface (not just localhost) so your iPad,
// phone, etc. can open the app over your home Wi-Fi.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // equivalent to 0.0.0.0 -- listen on all interfaces
    port: 5173, // pin the port so the iPad URL doesn't change
    strictPort: true,
  },
})
