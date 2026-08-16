import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const now = new Date()
const buildDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const [major, minor] = pkg.version.split('.')
const displayVersion = `v${major}.${minor}`

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    define: {
      __APP_NAME__: JSON.stringify(pkg.build.productName),
      __APP_VERSION__: JSON.stringify(displayVersion),
      __BUILD_DATE__: JSON.stringify(buildDate)
    }
  }
})
