import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './polyfills'
import './index.css'
import App from './App.tsx'
import WalletProvider from './components/wallet/WalletProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </HelmetProvider>
  </StrictMode>,
)
