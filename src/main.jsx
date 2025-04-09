import React from 'react';
import ReactDOM from 'react-dom/client';
import { WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import App from './App';
import './index.css';
import debug from './utils/debug';

// Get environment from env variable and determine network
const environment = import.meta.env.MODE;
const network = environment === 'testnet' ? 'testnet' : 'mainnet';

// Debug logging
debug.info('Current Environment:', environment);
debug.info('Selected Network:', network);
debug.info('All ENV Variables:', {
  MODE: import.meta.env.MODE,
  VITE_APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT,
  VITE_APP_NETWORK: import.meta.env.VITE_APP_NETWORK,
  VITE_APP_SKIP_SCORE_SUBMIT: import.meta.env.VITE_APP_SKIP_SCORE_SUBMIT,
  DEBUG_ENABLED: debug.isEnabled()
});

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
