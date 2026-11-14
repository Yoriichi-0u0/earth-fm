import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pre-bundle the heavy dependencies so a cold dev server never re-optimizes and reloads mid-session.
  optimizeDeps: { include: ['animejs', 'three', '@react-three/fiber', 'lucide-react', 'react', 'react-dom/client'] },
});
