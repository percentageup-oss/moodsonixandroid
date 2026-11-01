import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';

// Register service worker for PWA (web only, disabled on native Capacitor platforms)
if (!Capacitor.isNativePlatform()) {
  registerSW({ immediate: true });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
