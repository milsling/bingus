// Minimal stub for vite/client types to unblock TypeScript
// Remove this file if/when vite/client types are available from node_modules
declare module 'vite/client' {}

// Declare asset imports
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

declare module 'lucide-react';
declare module 'drizzle-orm';
declare module 'drizzle-orm/pg-core';
declare module 'drizzle-orm/node-postgres';
declare module 'date-fns';

interface ImportMetaEnv {
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
