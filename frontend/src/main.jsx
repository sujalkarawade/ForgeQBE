import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#0d1117',
          border: '1px solid #e2e5ed',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          fontWeight: '500',
          boxShadow: '0 4px 16px rgba(13,17,23,0.09), 0 0 0 1px rgba(13,17,23,0.05)',
          borderRadius: '10px',
          padding: '10px 14px',
        },
        success: { iconTheme: { primary: '#0d7a4e', secondary: '#edfaf3' } },
        error:   { iconTheme: { primary: '#c0192b', secondary: '#fff1f2' } },
      }}
    />
  </React.StrictMode>
);
