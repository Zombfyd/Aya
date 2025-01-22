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
import './App.css';
import config from '../config/config';
import { Transaction } from "@mysten/sui/transactions";

const GameApp = () => {
  // Wallet and client hooks
  const wallet = useWallet();
  const client = useSuiClient();
  const { balance } = useAccountBalance();
  const [digest, setDigest] = useState('');
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  // Game state management
  const [gameManagerInitialized, setGameManagerInitialized] = useState(false);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [gameState, setGameState] = useState({
    gameStarted: false,
    score: 0,
    isGameOver: false,
    hasValidPayment: false
  });
  const [leaderboardData, setLeaderboardData] = useState({
    mainFree: [],
    secondaryFree: [],
    mainPaid: [],
    secondaryPaid: [],
  });
  const [gameMode, setGameMode] = useState('free');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({
  verified: false,
  transactionId: null,
  error: null
});
  // Add new state for paid game attempts
  const [paidGameAttempts, setPaidGameAttempts] = useState(0);
  const MAX_PAID_ATTEMPTS = 4;
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
  useEffect(() => {
  const initializeGameManager = async () => {
    try {
      console.log('Initializing game manager...', {
        environment: process.env.NODE_ENV,
        network: config.network,
        packageId: config.packageId
      });

      if (!window.gameManager) {
        console.error('GameManager not found on window object');
        return;
      }

      const success = await window.gameManager.initialize();
      
      if (success) {
        console.log('Game manager initialized successfully', {
          environment: process.env.NODE_ENV,
          gameMode: gameMode,
          networkConfig: config.network
        });
        setGameManagerInitialized(true);
      } else {
        console.error('Game manager initialization returned false', {
          environment: process.env.NODE_ENV,
          gameMode: gameMode
        });
      }
    } catch (error) {
      console.error('Error initializing game manager:', error);
    }
  };

  initializeGameManager();
}, []);

// Modify payment status monitoring
useEffect(() => {
  if (transactionInProgress) {
    const checkPaymentStatus = async () => {
      try {
        if (paymentStatus.transactionId) {
          const status = await wallet.getTransactionBlock({
            digest: paymentStatus.transactionId,
            options: {
              showEvents: true,
              showEffects: true,
            },
          });

          if (status.effects?.status?.status === 'success') {
            setPaymentStatus(prev => ({
              ...prev,
              verified: true,
              error: null
            }));
            setGameState(prev => ({
              ...prev,
              hasValidPayment: true
            }));
            setPaidGameAttempts(0); // Reset attempts when payment is verified
            setTransactionInProgress(false);
          }
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
      }
    };

    const interval = setInterval(checkPaymentStatus, 2000);
    return () => clearInterval(interval);
  }
}, [transactionInProgress, paymentStatus.transactionId]);

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

  // In your component, add useEffect to watch wallet network changes
  useEffect(() => {
    if (wallet.connected) {
      config.updateNetwork(wallet.chain?.name);
    }
  }, [wallet.connected, wallet.chain]);

  const checkWalletBalance = async () => {
    try {
      console.log('Checking wallet balance...');
      
      // Use the balance from useAccountBalance hook
      const balanceInMist = BigInt(balance ?? 0);
      const balanceInSui = Number(balanceInMist) / 1_000_000_000;
      
      console.log('Wallet balance details:', {
        balanceInSui,
        balanceInMist: balanceInMist.toString(),
        requiredBalance: config.paymentConfig.minBalance / 1_000_000_000
      });
      
      return balanceInSui >= (config.paymentConfig.minBalance / 1_000_000_000);
    } catch (error) {
      console.error('Balance check error:', error);
      return false;
    }
  };
  // Modify handleGameStart
  const handleGameStart = async () => {
    if (gameMode === 'free' || !wallet.connected) {
      startGame();
      return;
    }

    if (!gameState.hasValidPayment) {
      try {
        console.log('Starting payment process...');
        setPaying(true);
        setTransactionInProgress(true);

        // Following exact Suiet example structure
        const tx = {
          kind: 'pay',
          data: {
            gasBudget: 10000000,
            inputCoins: [], // Let wallet select coins
            recipients: [config.getCurrentRecipients().primary],
            amounts: [config.paymentConfig.totalAmount]
          }
        };

        console.log('Transaction payload:', tx);

        // Following Suiet example structure exactly
        const response = await wallet.signAndExecuteTransaction({
          transaction: {
            kind: 'pay',
            data: tx.data
          }
        });

        console.log('Transaction response:', response);

        if (response.effects?.status?.status === 'success') {
          console.log('Transaction successful');
          setPaymentStatus(prev => ({
            ...prev,
            verified: true,
            transactionId: response.digest
          }));
          startGame();
        }

      } catch (error) {
        console.error('Payment process error:', error);
        alert(`Payment failed: ${error.message}`);
      } finally {
        setPaying(false);
        setTransactionInProgress(false);
      }
    } else {
      if (paidGameAttempts >= MAX_PAID_ATTEMPTS) {
        setGameState(prev => ({ ...prev, hasValidPayment: false }));
        return;
      }
      startGame();
    }
  };

  // Modify handleScoreSubmit to only require signatures for paid mode
  const handleScoreSubmit = async () => {
    if (!wallet.connected || !wallet.account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      let requestBody = {
        playerWallet: wallet.account.address,
        score: gameState.score,
        gameType: 'main'
      };

      if (gameMode === 'paid') {
        if (!paymentStatus.verified) {
          alert('Payment verification required for paid mode');
          return;
        }
        requestBody = {
          ...requestBody,
          sessionToken: paymentStatus.transactionId
        };
      }

      const endpoint = `${config.apiBaseUrl}/api/scores/submit/${gameMode}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Score submission failed');
      }

      console.log('Score submission successful');
      alert('Score submitted successfully!');
      
      await fetchLeaderboards();
      
      setGameState(prev => ({
        ...prev,
        gameStarted: false,
        isGameOver: false,
        score: 0
      }));

      if (gameMode === 'paid') {
        setPaidGameAttempts(prev => prev + 1);
        if (paidGameAttempts + 1 >= MAX_PAID_ATTEMPTS) {
          setGameState(prev => ({ ...prev, hasValidPayment: false }));
        }
      }

    } catch (error) {
      console.error('Score submission error:', error);
      alert(`Failed to submit score: ${error.message}`);
    }
  };

  // Leaderboard functions
  const fetchLeaderboards = async () => {
    console.log('Starting leaderboard fetch...');
    setIsLeaderboardLoading(true);
    
    const baseUrl = `${config.apiBaseUrl}/api/scores/leaderboard`;
    
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
          const url = `${baseUrl}/${endpoint}?t=${timestamp}`;
          console.log(`Fetching ${type} from:`, url);

          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
            },
            credentials: 'include',
            mode: 'cors'
          });

          if (!response.ok) {
            const text = await response.text();
            console.error(`Server response for ${type}:`, text);
            throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
          }

          console.log(`Response headers for ${type}:`, Object.fromEntries([...response.headers]));

          const text = await response.text();
          console.log(`Raw response for ${type}:`, text);

          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error(`JSON parse error for ${type}:`, e);
            throw e;
          }

          return validateLeaderboardData(data, type);
        } catch (error) {
          console.error(`Error fetching ${type}:`, error);
          return [];
        }
      };

      // Fetch all leaderboards
      const [mainFree, secondaryFree, mainPaid, secondaryPaid] = await Promise.all([
        fetchValidatedData('main/free', 'Main Free'),
        fetchValidatedData('secondary/free', 'Secondary Free'),
        fetchValidatedData('main/paid', 'Main Paid'),
        fetchValidatedData('secondary/paid', 'Secondary Paid')
      ]);

      // Update state with fetched data
      setLeaderboardData({
        mainFree,
        secondaryFree,
        mainPaid,
        secondaryPaid
      });
    } catch (error) {
      console.error('Error in fetchLeaderboards:', error);
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
  const startGame = async () => {
  console.log('Starting game with state:', {
    gameManagerInitialized,
    walletInitialized,
    gameMode
  });

  if (!window.gameManager) {
    console.error('Game manager not found');
    alert('Game initialization failed. Please refresh the page and try again.');
    return;
  }

  if (!gameManagerInitialized) {
    console.log('Attempting to initialize game manager...');
    try {
      const success = await window.gameManager.initialize();
      if (!success) {
        console.error('Game manager initialization failed');
        alert('Failed to initialize game. Please refresh the page and try again.');
        return;
      }
      setGameManagerInitialized(true);
    } catch (error) {
      console.error('Error initializing game manager:', error);
      alert('Error initializing game. Please refresh the page and try again.');
      return;
    }
  }

  try {
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      score: 0,
      isGameOver: false,
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    if (window.gameManager) {
      console.log(`Starting game in ${gameMode} mode`);
      window.gameManager.startGame(gameMode);
    } else {
      throw new Error('Game manager not initialized');
    }
  } catch (error) {
    console.error('Error starting game:', error);
    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      isGameOver: false,
    }));
    alert('Failed to start game. Please try again.');
  }
};

// Modify window.gameManager.onGameOver to handle signatures differently for free/paid modes
window.gameManager.onGameOver = async (finalScore) => {
  console.log('Game Over triggered with score:', finalScore);
  
  setGameState(prev => ({
    ...prev,
    score: finalScore,
    isGameOver: true,
    gameStarted: false
  }));

  if (gameMode === 'paid') {
    setPaidGameAttempts(prev => prev + 1);
  }

  try {
    if (!wallet.connected || !wallet.account) {
      console.log('No wallet connected, skipping submission');
      return;
    }

    let requestBody = {
      playerWallet: wallet.account.address,
      score: finalScore,
      gameType: 'main',
      gameMode,
    };

    // Only add signature for paid mode
    if (gameMode === 'paid') {
      const scoreMessage = JSON.stringify({
        playerAddress: wallet.account.address,
        score: finalScore,
        timestamp: Date.now(),
        gameMode,
        gameType: 'main'
      });

      const msgBytes = new TextEncoder().encode(scoreMessage);
      const signature = await wallet.signPersonalMessage({
        message: msgBytes,
      });

      requestBody = {
        ...requestBody,
        signature,
        message: scoreMessage,
      };
    }

    const endpoint = `https://ayagame.onrender.com/api/scores/submit/${gameMode}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('Score submission failed:', await response.text());
    } else {
      console.log('Score submission successful');
      await fetchLeaderboards();
    }
  } catch (error) {
    console.error('Error in game over handler:', error);
  }
};

  // Simple test transfer function
  const handleTestTransfer = async () => {
    if (!wallet.connected) {
      alert('Please connect wallet first');
      return;
    }

    try {
      console.log('Starting test transfer...');
      
      signAndExecuteTransaction(
        {
          transaction: new Transaction(),
          chain: 'sui:testnet',
        },
        {
          onSuccess: (result) => {
            console.log('executed transaction', result);
            setDigest(result.digest);
            alert('Transfer successful!');
          },
        },
      );

    } catch (error) {
      console.error('Transfer error:', error);
      alert(`Transfer failed: ${error.message}`);
    }
  };

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

          {wallet.connected && gameMode === 'paid' && gameState.hasValidPayment && (
            <div className="attempts-info">
              <p>Attempts remaining: {MAX_PAID_ATTEMPTS - paidGameAttempts}</p>
            </div>
          )}

          {wallet.connected && (
            <button 
              onClick={handleGameStart}
              disabled={gameMode === 'paid' && paying}
              className="start-button"
            >
              {gameMode === 'paid' 
                ? (gameState.hasValidPayment 
                    ? `Start Paid Game (${MAX_PAID_ATTEMPTS - paidGameAttempts} attempts left)`
                    : 'Pay 0.2 SUI for 4 Games') 
                : 'Start Free Game'}
            </button>
          )}

          {wallet.connected && (
            <button 
              onClick={handleTestTransfer}
              style={{ margin: '10px', padding: '10px' }}
            >
              Test Transfer (0.001 SUI)
            </button>
          )}

          {wallet.connected && (
            <div>
              <div>Digest: {digest}</div>
            </div>
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
