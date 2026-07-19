import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This app is served from a subpath on the shared S3 bucket / CloudFront
// (see .github/workflows/deploy.yml). `base` must match S3_PATH there so the
// built asset URLs resolve. Dev server stays at '/'.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/water-physics/' : '/',
  plugins: [react()],
}))
