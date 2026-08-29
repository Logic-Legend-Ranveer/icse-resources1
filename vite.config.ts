import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig(() => {
  const basepath = process.env.CF_PAGES ? '/' : '/icse-resources1/';

  return {
    plugins: [react(), tailwindcss()],
    base: basepath,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  }
})
