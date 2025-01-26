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
  useSuiClient,
  } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
// import './App.css';
import config from '../config/config';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const GameApp = () => {
  // Wallet and client hooks
  const wallet = useWallet();
  const client = useSuiClient();
  const { balance } = useAccountBalance();
  const [digest, setDigest] = useState('');
  
  // Game state management
  const [gameManagerInitialized, setGameManagerInitialized] = useState(false);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
  verified: true,
  transactionId: null,
  error: null
});
  // Add new state for paid game attempts
  const [paidGameAttempts, setPaidGameAttempts] = useState(0);
  const MAX_PAID_ATTEMPTS = 4;
  // Add this to your state declarations
  const [countdown, setCountdown] = useState(null);
   useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
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
  
  
  // Add mobile detection on component mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  // Utility function for chain name
  
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
       setCountdown(3);
      await new Promise((resolve) => {
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              resolve();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      });
      
      // Start the game after countdown is complete
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
        if (!paymentStatus.verified || !paymentStatus.transactionId) {
          alert('Payment verification required for paid mode');
          return;
        }
        requestBody = {
          ...requestBody,
          sessionToken: paymentStatus.transactionId,
          gameMode: 'paid'
        };
      }

      const endpoint = `https://ayagame.onrender.com/api/scores/${gameMode}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Score submission failed');
      }

      const result = await response.json();
      console.log('Score submission successful:', result);

      // Update game state and leaderboards
      if (gameMode === 'paid') {
        const newAttempts = paidGameAttempts + 1;
        setPaidGameAttempts(newAttempts);
        if (newAttempts >= MAX_PAID_ATTEMPTS) {
          setGameState(prev => ({ ...prev, hasValidPayment: false }));
        }
      }

      await fetchLeaderboards();
      
    } catch (error) {
      console.error('Score submission error:', error);
      alert(`Failed to submit score: ${error.message}`);
    }
  };

  // Leaderboard functions
  const fetchLeaderboards = async () => {
    setIsLeaderboardLoading(true);
    
    try {
      const baseUrl = `https://ayagame.onrender.com/api/scores/leaderboard`;
      
      const [mainFree, mainPaid] = await Promise.all([
        fetch(`${baseUrl}/main/free`),
        fetch(`${baseUrl}/main/paid`)
      ].map(promise => 
        promise
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .catch(error => {
            console.error('Leaderboard fetch error:', error);
            return [];
          })
      ));

      setLeaderboardData({
        mainFree,
        mainPaid
      });
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      setLeaderboardData({
        mainFree: [],
        mainPaid: []
      });
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // Leaderboard component
  const LeaderboardComponent = ({ data, title }) => {
    if (!data || data.length === 0) {
      return (
        <div className="leaderboard-section">
          <h3>{title}</h3>
          <p>No scores yet</p>
        </div>
      );
    }

    return (
      <div className="leaderboard-section">
        <h3>{title}</h3>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Wallet</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr key={index} className={index < 3 ? `rank-${index + 1}` : ''}>
                <td className="rank-cell">{index + 1}</td>
                <td className="wallet-cell" title={entry.playerWallet}>
                  {`${entry.playerWallet.slice(0, 6)}...${entry.playerWallet.slice(-4)}`}
                </td>
                <td className="score-cell">{entry.score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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

// Modify window.gameManager.onGameOver to properly handle score submissions
window.gameManager.onGameOver = async (finalScore) => {
  console.log('Game Over triggered with score:', finalScore);
  
  setGameState(prev => ({
    ...prev,
    score: finalScore,
    isGameOver: true,
    gameStarted: false
  }));

  try {
    if (!wallet.connected || !wallet.account) {
      console.log('No wallet connected, skipping submission');
      return;
    }

    let requestBody = {
      playerWallet: wallet.account.address,
      score: finalScore,
      gameType: 'main'
    };

    if (gameMode === 'paid') {
      if (!paymentStatus.verified || !paymentStatus.transactionId) {
        console.error('Missing payment verification for paid mode');
        return;
      }
      requestBody = {
        ...requestBody,
        sessionToken: paymentStatus.transactionId,
        gameMode: 'paid'
      };
    }

    const endpoint = `https://ayagame.onrender.com/api/scores/${gameMode}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Score submission failed');
    }

    const result = await response.json();
    console.log('Score submission successful:', result);

    await fetchLeaderboards();
    
    if (gameMode === 'paid') {
      setPaidGameAttempts(prev => prev + 1);
      if (paidGameAttempts + 1 >= MAX_PAID_ATTEMPTS) {
        setGameState(prev => ({ ...prev, hasValidPayment: false }));
      }
    }

  } catch (error) {
    console.error('Error in game over handler:', error);
    alert(`Failed to submit score: ${error.message}`);
  }
};

  const handleGamePayment = async () => {
  if (!wallet.connected) {
    alert('Please connect wallet first');
    return;
  }
  try {
    console.log('Starting game payment...');
    const recipients = config.getCurrentRecipients();
    const totalAmount = config.paymentConfig.totalAmount;
    
    // Calculate amounts based on shares
    const primaryAmount = Math.floor(totalAmount * (config.shares.primary / 10000));
    const secondaryAmount = Math.floor(totalAmount * (config.shares.secondary / 10000));
    const tertiaryAmount = Math.floor(totalAmount * (config.shares.tertiary / 10000));
    
    console.log('Payment distribution:', {
      total: totalAmount,
      primary: { address: recipients.primary, amount: primaryAmount },
      secondary: { address: recipients.secondary, amount: secondaryAmount },
      tertiary: { address: recipients.tertiary, amount: tertiaryAmount }
    });
    const txb = new TransactionBlock();
    
    // Split the coins for each recipient
    const [primaryCoin, secondaryCoin, tertiaryCoin] = txb.splitCoins(
      txb.gas,
      [primaryAmount, secondaryAmount, tertiaryAmount]
    );
    // Transfer to primary recipient
    txb.transferObjects(
      [primaryCoin],
      txb.pure(recipients.primary)
    );
    // Transfer to secondary recipient
    txb.transferObjects(
      [secondaryCoin],
      txb.pure(recipients.secondary)
    );
    // Transfer to tertiary recipient
    txb.transferObjects(
      [tertiaryCoin],
      txb.pure(recipients.tertiary)
    );
    const response = await wallet.signAndExecuteTransaction({
      transaction: txb,
      options: { showEffects: true }
    });
    console.log('Full Payment Response:', {
      response,
      digest: response.digest,
      effects: response.effects,
      status: response.effects?.status,
      statusDetails: response.effects?.status?.status
    });
    
    if (response.digest) {
      console.log('Transaction submitted with digest:', response.digest);
      setDigest(response.digest);
      
      setPaymentStatus(prev => ({
        ...prev,
        verified: true,
        transactionId: response.digest,
        timestamp: Date.now()
      }));
      setGameState(prev => ({
        ...prev,
        hasValidPayment: true,
        currentSessionId: response.digest
      }));
      
      // Set initial countdown and start the timer
      setCountdown(3);
      
      // Create a Promise that resolves after the countdown
      await new Promise((resolve) => {
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              resolve();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      });
      
      // Start the game after countdown is complete
      startGame();
    }
  } catch (error) {
    console.error('Payment error:', error);
    setCountdown(null);
    alert(`Payment failed: ${error.message}`);
  }
};

  // Add useEffect for periodic leaderboard updates
  useEffect(() => {
    fetchLeaderboards(); // Initial fetch
    
    const intervalId = setInterval(fetchLeaderboards, 30000); // Update every 30 seconds
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  // Render method
  return (
     <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {(!gameState.gameStarted && (paidGameAttempts >= MAX_PAID_ATTEMPTS || !gameState.hasValidPayment)) && (
        <header>
          <div className="wkit-connected-container">
            {isMobile && !wallet.connected && (
              <div className="mobile-wallet-guide">
                <p>To play on mobile:</p>
                <ol>
                  <li>Open this page in Sui Wallet or OKX Wallet's built-in browser</li>
                  <li>Connect your wallet using the button below</li>
                </ol>
              </div>
            )}
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
              onClick={gameMode === 'paid' && !gameState.hasValidPayment ? handleGamePayment : handleGameStart}
              disabled={gameMode === 'paid' && paying}
              className="start-button"
            >
              {gameMode === 'paid' 
                ? (gameState.hasValidPayment 
                    ? `Start Paid Game (${MAX_PAID_ATTEMPTS - paidGameAttempts} attempts left)`
                    : `Pay ${formatSUI(config.paymentConfig.totalAmount)} SUI for ${MAX_PAID_ATTEMPTS} Games`) 
                : 'Start Free Game'}
            </button>
          )}
        </header>
      )}

      <canvas id="tearCatchGameCanvas" className="game-canvas" />

      {gameState.isGameOver && (
        <div className="score-popup">
          <h2>Game Over!</h2>
          <p>Your Score: <span>{gameState.score}</span></p>
          {gameMode === 'paid' && (
            <p>Round {paidGameAttempts + 1} of {MAX_PAID_ATTEMPTS}</p>
          )}
          <div className="score-popup-buttons">
            {gameMode === 'free' && (
              <button onClick={handleScoreSubmit}>Submit Score</button>
            )}
            {(paidGameAttempts < MAX_PAID_ATTEMPTS && gameState.hasValidPayment) && (
              <button onClick={restartGame}>Play Again</button>
            )}
            {(paidGameAttempts >= MAX_PAID_ATTEMPTS || !gameState.hasValidPayment) && (
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
            )}
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

      {!gameState.gameStarted && (
        <div className="leaderboards-container">
          {isLeaderboardLoading ? (
            <div className="leaderboard-loading">Loading leaderboards...</div>
          ) : (
            <>
              <LeaderboardComponent 
                data={leaderboardData.mainFree} 
                title="Free Mode Leaderboard" 
              />
              <LeaderboardComponent 
                data={leaderboardData.mainPaid} 
                title="Paid Mode Leaderboard" 
              />
            </>
          )}
        </div>
      )}

      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-popup">
            <h2>Payment Successful!</h2>
            <p>Game starting in</p>
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-progress">
              <div 
                className="countdown-bar" 
                style={{ 
                  width: `${(countdown / 3) * 100}%`,
                  transition: 'width 1s linear'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameApp;
