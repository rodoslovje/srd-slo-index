import { defineConfig } from 'vite';

export default defineConfig({
  // Allow Vite to expose environment variables starting with VITE_ or SGI_
  envPrefix: ['VITE_', 'SGI_']
});