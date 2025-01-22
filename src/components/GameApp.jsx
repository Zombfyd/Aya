import { gameManager } from '../game/GameManager.js';
window.gameManager = gameManager;
import React, { useState, useEffect } from 'react';
import {
  ConnectButton,
  useAccountBalance,
  useWallet,
  SuiChainId,
  ErrorCode,
  formatSUI,
  useSuiClient
} from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import './App.css';
import config from '../config/config';

const GameApp = () => {
  const wallet = useWallet();
  const { balance } = useAccountBalance();
  const [digest, setDigest] = useState('');

  // Simple test transfer function
  const handleTestTransfer = async () => {
    if (!wallet.connected) {
      alert('Please connect wallet first');
      return;
    }

    try {
      console.log('Starting test transfer...');
      
      const tx = {
        kind: 'paySui',
        data: {
          amounts: [1000000], // 0.001 SUI
          recipients: ['0x2d81a1b3f1e5b06e7b07b9b2f1f2b367f477f5f6e6f0e8c7d8c6f4e3d2c1b0a9'],
          gasBudget: 10000000
        }
      };

      console.log('Transaction payload:', tx);
      console.log('Wallet status:', wallet.status);
      console.log('Chain:', wallet.chain);

      const response = await wallet.signAndExecuteTransaction({
        transaction: tx,
        options: {
          showEvents: true
        }
      });

      console.log('Transfer response:', response);
      setDigest(response.digest);
      alert('Transfer successful!');

    } catch (error) {
      console.error('Transfer error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      alert(`Transfer failed: ${error.message}`);
    }
  };

  return (
    <div className="game-container">
      <header>
        <ConnectButton />
        
        {wallet.connected && (
          <div>
            <p>Balance: {formatSUI(balance ?? 0)} SUI</p>
            <button 
              onClick={handleTestTransfer}
              style={{ margin: '10px', padding: '10px' }}
            >
              Test Transfer (0.001 SUI)
            </button>
            <div>Digest: {digest}</div>
          </div>
        )}
      </header>
    </div>
  );
};

export default GameApp;
