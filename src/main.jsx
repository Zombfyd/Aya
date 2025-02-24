import React from 'react';
import ReactDOM from 'react-dom/client';
import { WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import App from './App';
import './index.css';

// Get environment from env variable and determine network
const environment = import.meta.env.MODE;
const network = environment === 'testnet' ? 'testnet' : 'mainnet';

// Debug logging
console.log('Current Environment:', environment);
console.log('Selected Network:', network);
console.log('All ENV Variables:', import.meta.env);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider 
      defaultWallets={[]}
      autoConnect={true}
      chain={network}
    >
      <App environment={environment} network={network} />
    </WalletProvider>
  </React.StrictMode>
);
