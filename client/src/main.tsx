import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('Main.tsx loading...');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.log('Service worker registration failed:', error);
    });
  });
}

try {
  console.log('Creating React root...');
  const root = createRoot(document.getElementById("root")!);
  console.log('Rendering App...');
  root.render(<App />);
  console.log('App rendered successfully');
} catch (error) {
  console.error('Fatal error rendering app:', error);
  document.getElementById("root")!.innerHTML = `
    <div style="padding: 2rem; color: #ef4444;">
      <h1>Error Loading App</h1>
      <pre>${error}</pre>
    </div>
  `;
}
