import { gameManager } from '../game/GameManager.js';
window.gameManager = gameManager;
import React, { useState, useEffect, useMemo } from 'react';
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
import { Transaction } from '@mysten/sui/transactions';
import './App.css';
import config from './config';

const GameApp = () => {
  // Wallet and client hooks
  const wallet = useWallet();
  const client = useSuiClient();
  const { balance } = useAccountBalance();
  
  // Game state management
  const [gameManagerInitialized, setGameManagerInitialized] = useState(false);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [gameState, setGameState] = useState({
    gameStarted: false,
    score: 0,
    isGameOver: false,
  });
  const [leaderboardData, setLeaderboardData] = useState({
    mainFree: [],
    secondaryFree: [],
    mainPaid: [],
    secondaryPaid: [],
  });
  const [gameMode, setGameMode] = useState('free');
  const [paying, setPaying] = useState(false);

  // Utility function for chain name
  const chainName = (chainId) => {
    switch (chainId) {
      case SuiChainId.MAIN_NET:
        return "Mainnet";
      case SuiChainId.TEST_NET:
        return "Testnet";
      case SuiChainId.DEV_NET:
        return "Devnet";
      default:
        return "Unknown";
    }
  };

  // Enhanced wallet connection monitoring
  useEffect(() => {
    const updateWalletState = async () => {
      if (wallet.connected && wallet.account) {
        const requiredNetwork = process.env.NODE_ENV === 'development' ? 'Sui Testnet' : 'Sui Mainnet';
        
        if (wallet.chain?.name !== requiredNetwork) {
          console.log(`Wrong network detected. Current: ${wallet.chain?.name}, Required: ${requiredNetwork}`);
          setWalletInitialized(false);
          setGameState(prev => ({
            ...prev,
            gameStarted: false,
            isGameOver: false
          }));
          return;
        }

        console.log('Correct network detected:', wallet.chain?.name);
        window.currentWalletAddress = wallet.account.address;
        setWalletInitialized(true);
      } else {
        window.currentWalletAddress = null;
        setWalletInitialized(false);
      }
    };

    updateWalletState();
  }, [wallet.connected, wallet.account, wallet.chain?.name]);

  // Payment handling
  const handleGameStart = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }

    if (gameMode === 'free') {
      startGame();
      return;
    }

    try {
      const hasEnoughBalance = await checkWalletBalance();
      if (!hasEnoughBalance) {
        alert('Insufficient balance. You need at least 0.25 SUI to play (0.2 SUI game fee + gas)');
        return;
      }

      setPaying(true);
      setTransactionInProgress(true);

      const tx = new Transaction();
      tx.moveCall({
        target: `${config.packageId}::payment::pay_for_game`,
        arguments: [
          tx.pure.u64(config.paymentConfig.totalAmount),
          tx.object(config.paymentConfigId)
        ],
      });

      const response = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      console.log('Transaction response:', response);

      if (response.effects?.status?.status === 'success') {
        startGame();
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setPaying(false);
      setTransactionInProgress(false);
    }
  };

  // Score submission with signature verification
  const handleScoreSubmit = async () => {
    if (!wallet.connected || !wallet.account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const scoreMessage = JSON.stringify({
        playerAddress: wallet.account.address,
        score: gameState.score,
        timestamp: Date.now(),
        gameMode: gameMode,
        gameType: 'main'
      });

      const msgBytes = new TextEncoder().encode(scoreMessage);
      const signature = await wallet.signPersonalMessage({
        message: msgBytes,
      });

      // Verify signature
      const verifyResult = await wallet.verifySignedMessage(
        signature,
        wallet.account.publicKey
      );

      if (!verifyResult) {
        throw new Error('Score signature verification failed');
      }

      const endpoint = `https://ayagame.onrender.com/api/scores/submit/${gameMode}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerWallet: wallet.account.address,
          score: gameState.score,
          gameType: 'main',
          gameMode: gameMode,
          signature: signature,
          message: scoreMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      console.log('Score submission result:', result);
      alert('Score submitted successfully!');
      await fetchLeaderboards();
    } catch (error) {
      console.error('Score submission error:', error);
      alert(`Failed to submit score: ${error.message}`);
    }
  };

  // Leaderboard functions
  const fetchLeaderboards = async () => {
    console.log('Starting leaderboard fetch...');
    setIsLeaderboardLoading(true);
    
    const baseUrl = 'https://ayagame.onrender.com/api/scores/leaderboard';
    
    try {
      // Function to validate leaderboard data
      const validateLeaderboardData = (data, type) => {
        if (!Array.isArray(data)) {
          console.error(`Invalid ${type} data structure:`, data);
          return [];
        }
        
        return data.filter(entry => {
          const isValid = entry && 
                         typeof entry.playerWallet === 'string' && 
                         typeof entry.score === 'number';
          if (!isValid) {
            console.error(`Invalid entry in ${type}:`, entry);
          }
          return isValid;
        });
      };

      const fetchValidatedData = async (endpoint, type) => {
        try {
          const timestamp = Date.now();
          const response = await fetch(`${baseUrl}/${endpoint}?t=${timestamp}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          return validateLeaderboardData(data, type);
        } catch (error) {
          console.error(`Error fetching ${type}:`, error);
          return [];
        }
      };

      const [mainFree, secondaryFree, mainPaid, secondaryPaid] = await Promise.all([
        fetchValidatedData('main/free', 'mainFree'),
        fetchValidatedData('secondary/free', 'secondaryFree'),
        fetchValidatedData('main/paid', 'mainPaid'),
        fetchValidatedData('secondary/paid', 'secondaryPaid')
      ]);

      setLeaderboardData({
        mainFree,
        secondaryFree,
        mainPaid,
        secondaryPaid
      });
    } catch (error) {
      console.error('Overall leaderboard fetch error:', error);
      setLeaderboardData({
        mainFree: [],
        secondaryFree: [],
        mainPaid: [],
        secondaryPaid: []
      });
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  const renderLeaderboard = (data, title) => (
    <div className="leaderboard-section">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>Wallet</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {(data || []).map((entry, index) => (
            <tr key={index}>
              <td>{`${entry.playerWallet.slice(0, 6)}...${entry.playerWallet.slice(-4)}`}</td>
              <td>{entry.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Game restart function
  const restartGame = () => {
    if (!gameManagerInitialized) {
      console.error('Cannot restart game - game manager not initialized');
      return;
    }

    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      score: 0,
      isGameOver: false,
    }));

    setTransactionInProgress(false);
    setPaying(false);

    if (window.gameManager) {
      window.gameManager.cleanup();
    }

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        gameStarted: true
      }));
      
      if (window.gameManager) {
        console.log(`Restarting game in ${gameMode} mode`);
        window.gameManager.startGame(gameMode);
      }
    }, 100);
  };

  // Start game function
  const startGame = () => {
    if (!gameManagerInitialized) {
      console.error('Cannot start game - game manager not initialized');
      alert('Please wait for game to initialize');
      return;
    }

    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      score: 0,
      isGameOver: false,
    }));

    if (window.gameManager) {
      console.log(`Starting game in ${gameMode} mode`);
      window.gameManager.startGame(gameMode);
    } else {
      console.error('Game manager not initialized');
    }
  };

  // Initialize leaderboards
  useEffect(() => {
    fetchLeaderboards();
  }, []);

  // Render method
  return (
    <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {!gameState.gameStarted && (
        <header>
          <div className="wkit-connected-container">
            <ConnectButton
              onConnectError={(error) => {
                if (error.code === ErrorCode.WALLET__CONNECT_ERROR__USER_REJECTED) {
                  console.warn("User rejected connection to " + error.details?.wallet);
                } else {
                  console.warn("Unknown connect error: ", error);
                }
              }}
            />
          </div>

          {wallet.connected && (
            <div className="wallet-info">
              <p>Wallet: {wallet.adapter?.name}</p>
              <p>Status: {wallet.connecting ? "connecting" : wallet.connected ? "connected" : "disconnected"}</p>
              <p>Address: {wallet.account?.address}</p>
              <p>Network: {chainName(wallet.chain?.id)}</p>
              <p>Balance: {formatSUI(balance ?? 0, { withAbbr: false })} SUI</p>
            </div>
          )}

          {/* Rest of your existing UI components */}
          <div className="mode-selector">
            <button 
              onClick={() => setGameMode('free')}
              className={gameMode === 'free' ? 'active' : ''}
              disabled={!wallet.connected}
            >
              Free Mode
            </button>
            <button 
              onClick={() => setGameMode('paid')}
              className={gameMode === 'paid' ? 'active' : ''}
              disabled={!wallet.connected}
            >
              Paid Mode
            </button>
          </div>

          {wallet.connected && (
            <button 
              onClick={handleGameStart}
              disabled={paying}
              className="start-button"
            >
              {gameMode === 'paid' ? 'Pay 0.2 SUI and Start Game' : 'Start Free Game'}
            </button>
          )}
        </header>
      )}

      <canvas id="tearCatchGameCanvas" className="game-canvas" />

      <div className="leaderboards-container">
        {isLeaderboardLoading ? (
          <div className="loading-indicator">Loading leaderboards...</div>
        ) : (
          gameMode === 'paid' ? (
            <>
              {renderLeaderboard(leaderboardData.mainPaid, 'Main Paid Leaderboard')}
              {renderLeaderboard(leaderboardData.secondaryPaid, 'Secondary Paid Leaderboard')}
            </>
          ) : (
            <>
              {renderLeaderboard(leaderboardData.mainFree, 'Main Free Leaderboard')}
              {renderLeaderboard(leaderboardData.secondaryFree, 'Secondary Free Leaderboard')}
            </>
          )
        )}
      </div>

      {gameState.isGameOver && (
        <div className="score-popup">
          <h2>Game Over!</h2>
          <p>Your Score: <span>{gameState.score}</span></p>
          <div className="score-popup-buttons">
            <button onClick={handleScoreSubmit}>Submit Score</button>
            <button onClick={restartGame}>Play Again</button>
            <button 
              onClick={() => {
                setGameState({
                  gameStarted: false,
                  isGameOver: false,
                  score: 0
                });
              }}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
      
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <p>Wallet Connected: {String(wallet.connected)}</p>
          <p>Wallet Initialized: {String(walletInitialized)}</p>
          <p>Game Manager Initialized: {String(gameManagerInitialized)}</p>
          <p>Wallet Name: {wallet.adapter?.name || 'None'}</p>
          <p>Wallet Address: {wallet.account?.address || 'None'}</p>
          <p>Game Mode: {gameMode}</p>
          <p>Game Started: {String(gameState.gameStarted)}</p>
          <p>Score: {gameState.score}</p>
        </div>
      )}
    </div>
  );
};

export default GameApp;
