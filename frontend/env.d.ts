/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Inlined at build time, never read at runtime: changing it requires a rebuild.
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
