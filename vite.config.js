import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import UnoCSS from '@unocss/vite'

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.js'],
      refresh: true,
    }),
    UnoCSS(),
  ],
  build: {
    // The HID protocol layer is loaded only after a device connects or demo
    // mode starts, so it is worth splitting out of the initial bundle.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('resources/js/hid/')) return 'hid'
          if (id.includes('node_modules/alpinejs') || id.includes('node_modules/htmx')) return 'vendor'
        },
      },
    },
  },
  server: {
    watch: { ignored: ['**/storage/framework/views/**'] },
  },
})
