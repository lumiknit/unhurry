/// <reference types="vite/client" />

declare const PACKAGE_VERSION: string;

interface ImportMetaEnv {
    readonly PACKAGE_VERSION: string;
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
