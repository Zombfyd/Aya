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
      
      // Using moveCall format instead
      const tx = {
        kind: 'moveCall',
        data: {
          packageObjectId: '0x2',
          module: 'pay',
          function: 'split_and_transfer',
          typeArguments: [],
          arguments: [
            1000000, // amount (0.001 SUI)
            '0x2d81a1b3f1e5b06e7b07b9b2f1f2b367f477f5f6e6f0e8c7d8c6f4e3d2c1b0a9' // recipient
          ],
          gasBudget: 10000000
        }
      };

      console.log('Transaction payload:', tx);

      const response = await wallet.signAndExecuteTransaction({
        transaction: tx
      });

      console.log('Transfer response:', response);
      setDigest(response.digest);
      alert('Transfer successful!');

    } catch (error) {
      console.error('Transfer error:', error);
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
