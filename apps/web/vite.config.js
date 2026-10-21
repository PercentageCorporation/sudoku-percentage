import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
	server: {
		port: 5179,
	},
	build: {
		outDir: 'build',
		assetsDir: 'assets'
	},
	plugins: [
		react(),
		tailwindcss()

	],
})

