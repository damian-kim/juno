import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

if (new URLSearchParams(window.location.search).get('embed') === 'portfolio') {
  document.documentElement.classList.add('portfolio-embed');
}

createRoot(document.getElementById('root')).render(
  <App />
);
