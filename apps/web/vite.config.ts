import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei']
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': 'http://localhost:3001'
        }
    },
    define: {
        'process.env': {}
    },
    optimizeDeps: {
        include: ['three', '@react-three/fiber', '@react-three/drei', 'gsap', 'react-reconciler']
    }
})
