import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Buffer } from 'buffer';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ThemeProvider from './components/ThemeProvider.jsx';
import { setupErrorHandlers } from './utils/errorHandler.js';

// Polyfill Buffer and global for browser environment (needed for swagger-parser)
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  window.global = window.global || window;
}

// Setup global error handlers for telemetry
setupErrorHandlers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);