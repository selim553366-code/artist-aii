import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const renderError = (error: any) => {
  document.body.innerHTML = `
    <div style="background: #18181b; color: #ef4444; padding: 20px; font-family: monospace; height: 100vh; overflow: auto;">
      <h2>Global Error Caught</h2>
      <pre>${error?.stack || error?.message || String(error)}</pre>
    </div>
  `;
};

window.addEventListener('error', (e) => renderError(e.error));
window.addEventListener('unhandledrejection', (e) => renderError(e.reason));

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e) {
  renderError(e);
}
