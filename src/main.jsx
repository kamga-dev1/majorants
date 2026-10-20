import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import App from './App.jsx';
import './styles.css';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e9f0ff', 100: '#cbd9ff', 200: '#a8c0ff', 300: '#83a6ff',
      400: '#5e8bfa', 500: '#376fe0', 600: '#2456b8', 700: '#19418f',
      800: '#102c68', 900: '#081a42',
    },
  },
  fonts: { heading: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.isSecureContext) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
        console.error('Impossible d’activer le cache hors ligne.', error);
      });
    }
  });
}
