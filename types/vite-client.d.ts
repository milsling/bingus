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
