/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_API_BASE_URL?: string
  readonly VITE_AI_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
