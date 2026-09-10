import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL('./src', import.meta.url)),
        },
        dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei']
    },
    server: {
        port: 5173,
        strictPort: true,
        watch: {
            usePolling: true,
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:3001',
                ws: true,
                changeOrigin: true
            }
        }
    },
    define: {
        'process.env': {}
    },
    optimizeDeps: {
        include: ['three', '@react-three/fiber', '@react-three/drei', 'gsap', 'react-reconciler']
    }
})
