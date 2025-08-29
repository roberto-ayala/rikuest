import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import ThemeProvider from './components/ThemeProvider.jsx';

// Debug logs only, no alerts
console.log('main.jsx loaded - Environment check:', {
  wailsContext: !!window.__WAILS_CONTEXT__,
  goObject: !!window.go,
  location: window.location.href,
  userAgent: navigator.userAgent
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);