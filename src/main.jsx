import React from 'react';
import ReactDOM from 'react-dom/client';
import { WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider 
      defaultWallets={[]}
      autoConnect={true}
      chain="mainnet"
    >
      <App />
    </WalletProvider>
  </React.StrictMode>
);
