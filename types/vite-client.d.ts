// Minimal stub for vite/client types to unblock TypeScript
// Remove this file if/when vite/client types are available from node_modules
declare module 'vite/client' {}

// Asset imports (Vite resolves these at build time)
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }
declare module '@/assets/*.png' { const src: string; export default src; }
declare module '@/assets/*.jpg' { const src: string; export default src; }
declare module '@/assets/*.jpeg' { const src: string; export default src; }
declare module '@/assets/*.webp' { const src: string; export default src; }
declare module '@/assets/*.svg' { const src: string; export default src; }
