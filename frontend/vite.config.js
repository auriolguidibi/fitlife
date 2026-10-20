import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    // Sous-dossier du site (GitHub Pages : /fitlife/) ; « / » pour l'APK et le serveur.
    base: process.env.VITE_BASE || '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Bibliothèques séparées de l'application : mises en cache indépendamment, pages chargées à la demande.
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                    icons: ['lucide-react'],
                },
            },
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            // Photos de profil envoyées à l'API PHP (mode api)
            '/uploads': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
});
