import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { MessagesProvider } from './context/MessagesContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import App from './App.jsx';
import { initNative } from './native.js';
import './styles/index.css';

// Apply native status-bar styling etc. when running inside Capacitor (no-op on web).
initNative();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <MessagesProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </MessagesProvider>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
