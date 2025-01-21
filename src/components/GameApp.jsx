import React, { useState, useEffect } from 'react';
import { useWallet, ConnectButton } from '@suiet/wallet-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import config from '../config/config';
import { gameManager } from '../game/GameManager';

// Initialize gameManager on window for global access
window.gameManager = gameManager;

const GameApp = () => {
  // Wallet and initialization states
  const [gameManagerInitialized, setGameManagerInitialized] = useState(false);
  const wallet = useWallet();
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  
  // Game states
  const [gameState, setGameState] = useState({
    gameStarted: false,
    score: 0,
    isGameOver: false,
  });
  
  // Leaderboard and game mode states
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

  // Wallet connection monitoring
  useEffect(() => {
    const updateWalletState = async () => {
      if (wallet.connected && wallet.account) {
        const requiredNetwork = import.meta.env.MODE === 'development' ? 'Sui Testnet' : 'Sui Mainnet';
        
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

  // Environment and config validation
  useEffect(() => {
    const environment = import.meta.env.MODE;
    const currentConfig = config;

    console.log('Current environment:', environment);

    if (!currentConfig.packageId) {
      console.error(`[${environment}] Warning: Package ID is not properly configured`);
    }

    if (!currentConfig.paymentConfigId) {
      console.error(`[${environment}] Warning: Payment Config ID is not properly configured`);
    }

    if (!currentConfig.network) {
      console.error(`[${environment}] Warning: Network configuration is not properly set`);
    }

    console.log('Current configuration:', {
      environment,
      packageId: currentConfig.packageId,
      paymentConfigId: currentConfig.paymentConfigId,
      network: currentConfig.network,
      paymentConfig: currentConfig.paymentConfig
    });
  }, []);

  // Game Manager initialization
  useEffect(() => {
    const initializeGameManager = async () => {
      try {
        if (!window.gameManager) {
          console.error('GameManager not found on window object');
          return;
        }

        const success = await window.gameManager.initialize();
        
        if (success) {
          console.log('Game manager initialized successfully');
          setGameManagerInitialized(true);
        } else {
          console.error('Game manager initialization returned false');
        }
      } catch (error) {
        console.error('Error initializing game manager:', error);
      }
    };

    fetchLeaderboards();
    initializeGameManager();
  }, []);

  // Game initialization when wallet is ready
  useEffect(() => {
    const initializeGame = async () => {
      if (!window.gameManager || !walletInitialized) {
        return;
      }

      try {
        const success = await window.gameManager.initialize();
        
        if (!success) {
          throw new Error('Game manager initialization returned false');
        }

        // Set up game over handler
        window.gameManager.onGameOver = async (finalScore) => {
          console.log('Game Over triggered with score:', finalScore);
          
          setGameState(prev => ({
            ...prev,
            score: finalScore,
            isGameOver: true,
            gameStarted: false
          }));

          if (wallet.connected && wallet.account) {
            await handleScoreSubmit(finalScore);
          }
        };
      } catch (error) {
        console.error('Failed to initialize game:', error);
        setGameManagerInitialized(false);
      }
    };

    initializeGame();
  }, [walletInitialized, wallet.connected, wallet.account, gameMode]);

  // Wallet balance check
  const checkWalletBalance = async () => {
    try {
      const coins = await wallet.getCoins();
      const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      const balanceInSui = Number(totalBalance) / 1_000_000_000;
      
      return balanceInSui >= (config.paymentConfig.minBalance / 1_000_000_000);
    } catch (error) {
      console.error('Balance check error:', error);
      return false;
    }
  };

  // Game start handler
  const handleGameStart = async () => {
    if (!wallet.connected) {
      alert('Please connect your wallet first');
      return;
    }

    const initializeGameState = async () => {
      setGameState(prev => ({
        ...prev,
        gameStarted: true,
        score: 0,
        isGameOver: false,
      }));

      await new Promise(resolve => setTimeout(resolve, 300));

      if (!window.gameManager) {
        throw new Error('Game manager not initialized');
      }
      
      window.gameManager.startGame(gameMode);
    };

    if (gameMode === 'free') {
      try {
        await initializeGameState();
      } catch (error) {
        console.error('Game initialization error:', error);
        setGameState(prev => ({
          ...prev,
          gameStarted: false,
          isGameOver: false,
        }));
        alert('Error starting game. Please try again.');
      }
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

      const txb = new TransactionBlock();
      txb.setGasBudget(20000000);
      
      const [paymentCoin] = txb.splitCoins(txb.gas, [
        txb.pure.u64(config.paymentConfig.totalAmount)
      ]);

      txb.moveCall({
        target: `${config.packageId}::payment::pay_for_game`,
        typeArguments: [],
        arguments: [
          paymentCoin,
          txb.object(config.paymentConfigId)
        ],
      });

      const response = await wallet.signAndExecuteTransaction({
        transaction: txb,
        options: {
          showEvents: true,
          showEffects: true,
          showInput: true,
        }
      });

      if (
        response.effects?.status?.status === 'success' ||
        response.confirmedLocalExecution === true ||
        (response.effects && !response.effects.status?.error)
      ) {
        try {
          await initializeGameState();
        } catch (gameError) {
          console.error('Game initialization error:', gameError);
          setGameState(prev => ({
            ...prev,
            gameStarted: false,
            isGameOver: false,
          }));
          alert('Transaction successful but game failed to start. Please refresh and try again.');
        }
      } else {
        throw new Error(
          `Transaction failed: ${
            response.effects?.status?.error || 
            'Transaction was not confirmed. Please check your wallet for status.'
          }`
        );
      }

    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setPaying(false);
      setTransactionInProgress(false);
    }
  };

  // Score submission handler
  const handleScoreSubmit = async (score = gameState.score) => {
    if (!wallet.connected || !wallet.account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      const scoreMessage = JSON.stringify({
        playerAddress: wallet.account.address,
        score,
        timestamp: Date.now(),
        gameMode,
        gameType: 'main',
        metadata: {
          network: wallet.chain?.name,
          walletProvider: wallet.name
        }
      });

      const signature = await wallet.signPersonalMessage({
        message: new TextEncoder().encode(scoreMessage),
      });

      const response = await fetch(`https://ayagame.onrender.com/api/scores/submit/${gameMode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerWallet: wallet.account.address,
          score,
          gameType: 'main',
          gameMode,
          signature,
          message: scoreMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      console.log('Score submission successful:', result);
      await fetchLeaderboards();
    } catch (error) {
      console.error('Error submitting score:', error);
      alert(`Failed to submit score: ${error.message}`);
    }
  };

  // Leaderboard fetching
  const fetchLeaderboards = async () => {
    console.log('Starting leaderboard fetch...');
    setIsLeaderboardLoading(true);
    
    try {
      const timestamp = Date.now();
      const baseUrl = 'https://ayagame.onrender.com/api/scores/leaderboard';
      
      const fetchData = async (endpoint) => {
        const response = await fetch(`${baseUrl}/${endpoint}?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      };

      const [mainFree, secondaryFree, mainPaid, secondaryPaid] = await Promise.all([
        fetchData('main/free'),
        fetchData('secondary/free'),
        fetchData('main/paid'),
        fetchData('secondary/paid')
      ]);

      setLeaderboardData({
        mainFree,
        secondaryFree,
        mainPaid,
        secondaryPaid
      });
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
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

  // Game restart handler
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
        window.gameManager.startGame(gameMode);
      }
    }, 100);
  };

  // Render leaderboard
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

  return (
    <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {!gameState.gameStarted && (
        <header>
          <div className="wkit-connected-container">
            <ConnectButton />
          </div>
          
          {wallet.connected && wallet.account && (
            <div className="wallet-status">
              <div className="wallet-info">
                Connected to {wallet.name}
                <br />
                {wallet.account.address.slice(0, 6)}...{wallet.account.address.slice(-4)}
              </div>
            </div>
          )}

          <div className="mode-selector">
            <button 
              onClick={() => {
                setGameMode('free');
                setTransactionInProgress(false);
                setPaying(false);
              }}
              className={gameMode === 'free' ? 'active' : ''}
              disabled={!wallet.connected}
            >
              Free Mode
            </button>
            <button 
              onClick={() => {
                setGameMode('paid');
                setTransactionInProgress(false);
                setPaying(false);
              }}
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

          {!wallet.connected && (
            <p className="connect-prompt">Please connect your wallet to start playing</p>
          )}

          {gameMode === 'paid' && transactionInProgress && (
            <div className="transaction-status">
              Transaction in progress...
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
            <button onClick={() => handleScoreSubmit()}>Submit Score</button>
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

      {import.meta.env.DEV && (
        <div className="debug-info">
          <p>Wallet Connected: {String(wallet.connected)}</p>
          <p>Wallet Initialized: {String(walletInitialized)}</p>
          <p>Game Manager Initialized: {String(gameManagerInitialized)}</p>
          <p>Wallet Name: {wallet.name || 'None'}</p>
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
