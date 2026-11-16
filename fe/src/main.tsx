/**
 * Application entry point (loaded by `index.html`).
 *
 * Imports the global stylesheet and mounts the React app into the `#root`
 * element inside StrictMode, which helps surface effect/cleanup bugs in development.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
