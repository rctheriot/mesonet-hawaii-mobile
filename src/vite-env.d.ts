/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Region id selected at build time; see src/config/regions.data.ts. */
  readonly VITE_APP_DATA?: string;
  readonly VITE_MESONET_API_KEY?: string;
  readonly VITE_CARTO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
