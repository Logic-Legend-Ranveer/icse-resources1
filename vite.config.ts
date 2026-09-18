import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import prerender from "vite-plugin-prerender"

export default defineConfig(() => {
  let basepath = '/';

  if (process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    basepath = `/${repoName}/`;
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      prerender({
        staticDir: path.join(__dirname, 'dist'),
        routes: ['/'],
      }),
    ],
    base: basepath,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  }
})