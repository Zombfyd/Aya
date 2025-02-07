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
import { SuinsClient } from '@mysten/suins';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

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
  const [maxAttempts, setMaxAttempts] = useState(0);
  // Add this to your state declarations
  const [countdown, setCountdown] = useState(null);
  // Add new state for selected tier
  const [selectedTier, setSelectedTier] = useState(null);
  // Add this to fetch SUI price (you might want to add this to your dependencies)
  const [suiPrice, setSuiPrice] = useState(null);
  const [suinsClient, setSuinsClient] = useState(null);
  const [addressToNameCache, setAddressToNameCache] = useState({});
  const [displayName, setDisplayName] = useState('');
  
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
      // Single countdown for free mode
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
      
      startGame();
      return;
    }

    // Paid mode flow
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
      if (paidGameAttempts >= maxAttempts) {
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
        score: gameState.score
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

      // Submit to both main and secondary leaderboards
      const submissions = ['main', 'secondary'].map(async (type) => {
        // Updated endpoint URL structure
        const endpoint = `https://ayagame.onrender.com/api/scores/${gameMode}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({ ...requestBody, gameType: type })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${type} submission failed: ${errorData.error}`);
        }

        return response.json();
      });

      await Promise.all(submissions);
      console.log('Score submissions successful');

      if (gameMode === 'paid') {
        const newAttempts = paidGameAttempts + 1;
        setPaidGameAttempts(newAttempts);
        if (newAttempts >= maxAttempts) {
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

  // Updated SuiNS client initialization for mainnet
  useEffect(() => {
    const initializeSuinsClient = async () => {
      try {
        const suiClient = new SuiClient({ 
          url: getFullnodeUrl('mainnet')
        });
        
        const newSuinsClient = new SuinsClient({
          client: suiClient,
          packageIds: {
            suinsPackageId: {
              latest: '0xb7004c7914308557f7afbaf0dca8dd258e18e306cb7a45b28019f3d0a693f162',
              v1: '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0',
            },
            suinsObjectId: '0x6e0ddefc0ad98889c04bab9639e512c21766c5e6366f89e696956d9be6952871',
            utilsPackageId: '0xdac22652eb400beb1f5e2126459cae8eedc116b73b8ad60b71e3e8d7fdb317e2',
            registrationPackageId: '0x9d451fa0139fef8f7c1f0bd5d7e45b7fa9dbb84c2e63c2819c7abd0a7f7d749d',
            renewalPackageId: '0xd5e5f74126e7934e35991643b0111c3361827fc0564c83fa810668837c6f0b0f',
            registryTableId: '0xe64cd9db9f829c6cc405d9790bd71567ae07259855f4fba6f02c84f52298c106',
          }
        });

        setSuinsClient(newSuinsClient);
      } catch (error) {
        console.error('Error initializing SuiNS client:', error);
      }
    };

    initializeSuinsClient();
  }, []);

  // Using only the confirmed getNameRecord function
  const getSuiNSName = async (address) => {
    if (!suinsClient) return null;
    if (!address) return null;
    
    try {
      // We know this function works from our demo.sui test
      const nameRecord = await suinsClient.getNameRecord(address);
      console.log('Name Record:', nameRecord);

      if (nameRecord && nameRecord.name) {
        return nameRecord.name;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching SuiNS name:', error);
      return null;
    }
  };

  // Modify the LeaderboardComponent to use SuiNS names
  const LeaderboardComponent = ({ data, title }) => {
    const [resolvedNames, setResolvedNames] = useState({});

    // Resolve SuiNS names when leaderboard data changes
    useEffect(() => {
      const resolveNames = async () => {
        const names = {};
        for (const entry of data) {
          const name = await getSuiNSName(entry.playerWallet);
          if (name) {
            names[entry.playerWallet] = name;
          }
        }
        setResolvedNames(names);
      };

      if (data.length > 0 && suinsClient) {
        resolveNames();
      }
    }, [data, suinsClient]);

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
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry, index) => (
              <tr key={index} className={index < 3 ? `rank-${index + 1}` : ''}>
                <td className="rank-cell">{index + 1}</td>
                <td 
                  className="wallet-cell" 
                  data-suins={!!resolvedNames[entry.playerWallet]}
                  title={`Wallet: ${entry.playerWallet}`}
                >
                  <span className="player-name">
                    {resolvedNames[entry.playerWallet] || 
                     `${entry.playerWallet.slice(0, 6)}...${entry.playerWallet.slice(-4)}`}
                  </span>
                  <span className="wallet-tooltip">
                    {entry.playerWallet}
                  </span>
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

    // Check if we can start another paid game
    if (gameMode === 'paid') {
      if (paidGameAttempts >= maxAttempts) {
        alert('All paid attempts used. Please make a new payment to continue playing.');
        return;
      }
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

  // Update startGame to track bucket click state
  const startGame = () => {
    if (!window.gameManager) {
      console.error('Game manager not found');
      alert('Game initialization failed. Please refresh the page and try again.');
      return;
    }

    try {
      setGameState(prev => ({
        ...prev,
        gameStarted: true,
        score: 0,
        isGameOver: false,
      }));

      // Add smooth scrolling to center the canvas
      const canvas = document.getElementById('tearCatchGameCanvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scrollTop = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }

      if (window.gameManager) {
        console.log(`Starting game in ${gameMode} mode`);
        window.gameManager.startGame(gameMode);
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
      gameStarted: false,
      // Don't reset hasValidPayment here since we still have attempts left
    }));

    try {
      if (!wallet.connected || !wallet.account) {
        console.log('No wallet connected, skipping submission');
        return;
      }

      let requestBody = {
        playerWallet: wallet.account.address,
        score: finalScore
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

      // Submit to both main and secondary leaderboards
      const submissions = ['main', 'secondary'].map(async (type) => {
        // Updated endpoint URL structure
        const endpoint = `https://ayagame.onrender.com/api/scores/${gameMode}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({ ...requestBody, gameType: type })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${type} submission failed: ${errorData.error}`);
        }

        return response.json();
      });

      await Promise.all(submissions);
      console.log('Score submissions successful');

      await fetchLeaderboards();
      
      if (gameMode === 'paid') {
        const newAttempts = paidGameAttempts + 1;
        setPaidGameAttempts(newAttempts);
        
        // Only reset hasValidPayment if we've used all attempts
        if (newAttempts >= maxAttempts) {
          setGameState(prev => ({ 
            ...prev, 
            hasValidPayment: false 
          }));
          console.log('All paid attempts used, requiring new payment');
        } else {
          console.log(`${maxAttempts - newAttempts} paid attempts remaining`);
        }
      }

    } catch (error) {
      console.error('Error in game over handler:', error);
      alert(`Failed to submit score: ${error.message}`);
    }
  };

  // Add this function to check if user can afford a tier
  const canAffordTier = (tierAmount) => {
    const balanceInMist = BigInt(balance ?? 0);
    return balanceInMist >= BigInt(tierAmount);
  };

  // Add this to fetch SUI price (you might want to add this to your dependencies)
  useEffect(() => {
    const fetchSuiPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
        const data = await response.json();
        setSuiPrice(data.sui.usd);
      } catch (error) {
        console.error('Error fetching SUI price:', error);
      }
    };
    
    fetchSuiPrice();
    const interval = setInterval(fetchSuiPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Modify handleGamePayment to use selected tier
  const handleGamePayment = async () => {
    if (!wallet.connected || !selectedTier) {
      alert('Please connect wallet and select a payment tier');
      return;
    }

    const tierConfig = config.paymentTiers[selectedTier];
    
    try {
      console.log('Starting game payment for tier:', selectedTier);
      const recipients = config.getCurrentRecipients();
      const totalAmount = tierConfig.amount;
      
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

      // Update maxAttempts based on selected tier
      setMaxAttempts(tierConfig.plays);
      setPaidGameAttempts(0);
      
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

  useEffect(() => {
    // Prevent scrolling on touch devices during gameplay
    const preventScroll = (e) => {
      if (gameState.gameStarted) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('touchstart', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('touchstart', preventScroll);
    };
  }, [gameState.gameStarted]);

  // Add this to your render method where you have the payment button
  const renderPaymentTiers = () => (
    <div className="payment-tiers">
      {Object.entries(config.paymentTiers).map(([tierId, tier]) => {
        const suiAmount = tier.amount / 1000000000;
        const usdAmount = suiPrice ? (suiAmount * suiPrice).toFixed(2) : '---';
        const canAfford = canAffordTier(tier.amount);
        
        return (
          <button
            key={tierId}
            className={`tier-button ${selectedTier === tierId ? 'selected' : ''} ${canAfford ? '' : 'disabled'}`}
            onClick={() => setSelectedTier(tierId)}
            disabled={!canAfford}
          >
            <div className="tier-label">{tier.label}</div>
            <div className="tier-price">{suiAmount} SUI (${usdAmount})</div>
            <div className="tier-plays">{tier.plays} {tier.plays === 1 ? 'Play' : 'Plays'}</div>
            {!canAfford && <div className="insufficient-funds">Insufficient Balance</div>}
          </button>
        );
      })}
    </div>
  );
useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      if (window.scrollY > window.innerHeight * 0.3) { // Adjust this value as needed
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Add this effect to set the display name when wallet connects
  useEffect(() => {
    const updateDisplayName = async () => {
      if (wallet.connected && wallet.account) {
        // Try to get SuiNS name first
        const suiName = await getSuiNSName(wallet.account.address);
        if (suiName) {
          setDisplayName(suiName);
        } else {
          // Fallback to first 4 digits of wallet
          setDisplayName(wallet.account.address.slice(0, 4));
        }
      } else {
        setDisplayName('');
      }
    };

    updateDisplayName();
  }, [wallet.connected, wallet.account]);
  
  // Render method
  return (
    
     <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {displayName && (
        <div className="player-display">
          Playing as: <span className="player-name">{displayName}</span>
        </div>
      )}
      {(!gameState.gameStarted && (paidGameAttempts >= maxAttempts || !gameState.hasValidPayment)) && (
        <header>
          <div className="title">Tears of Aya</div>
           <div className="wkit-connected-container">
            {isMobile && !wallet.connected && (
              <div className="mobile-wallet-guide">
                <p>To play on mobile:</p>
                <ol>
                  <li>Open this page in Sui Wallet or OKX Wallet's built-in browser</li>
                  <li>Make sure you're on Sui Mainnet</li>
                  <li>Connect your wallet using the button below</li>
                </ol>
              </div>
            )}
             
            <ConnectButton
              label="Connect SUI Wallet"
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
              <p className="creator-credit">
            Created by <a 
              href="https://x.com/Zombfyd" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="creator-name"
            >
             🎮 Zombfyd 🎮
            </a>
          </p>
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
              <p>Attempts remaining: {maxAttempts - paidGameAttempts}</p>
            </div>
          )}

          {wallet.connected && (
  gameMode === 'free' ? (
    <button 
      onClick={handleGameStart}
      className="start-button"
    >
      Start Free Game
    </button>
  ) : (
    !gameState.hasValidPayment && (
      <>
        <div className="payment-section">
          <h3>Select Payment Tier</h3>
          
          {/* Mobile dropdown */}
          <div className="payment-tiers-mobile">
            <select 
              className="tier-select"
              value={selectedTier || ''}
              onChange={(e) => setSelectedTier(e.target.value)}
            >
              <option value="">Select Payment Tier</option>
              <option value="tier3">A Quickie - 0.4 SUI (1 Play)</option>
              <option value="tier2">Short Brake - 0.8 SUI (2 Plays)</option>
              <option value="tier1">Degen Time! - 1.0 SUI (3 Plays)</option>
            </select>
          </div>

          {/* Desktop payment tiers */}
          {renderPaymentTiers()}
        </div>

        <button 
          onClick={handleGamePayment}
          disabled={paying || !selectedTier}
          className="start-button"
        >
          {paying ? 'Processing...' : `Pay for ${config.paymentTiers[selectedTier]?.plays || ''} Games`}
        </button>
      </>
    )
  )
)}
        </header>
      )}

      <canvas id="tearCatchGameCanvas" className={`game-canvas ${gameState.gameStarted ? 'centered-canvas' : ''}`} />

      {gameState.isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-popup">
      <h2>Game Over!</h2>
      <p>Final Score: {gameState.score}</p>
      {gameMode === 'paid' && (
        <p>Attempts remaining: {maxAttempts - paidGameAttempts}</p>
      )}
      
      {(gameMode === 'free' || paidGameAttempts < maxAttempts) && (
        <div className="game-over-buttons">  {/* Added wrapper div */}
          <button 
            onClick={restartGame} 
            className="restart-button"
          >
            Play Again
          </button>
          <button 
            onClick={() => {
              setGameState(prev => ({
                ...prev,
                isGameOver: false,
                hasValidPayment: false
              }));
            }}
            className="return-menu-button"
          >
            Return to Menu
          </button>
        </div>
      )}
      
      {gameMode === 'paid' && paidGameAttempts >= maxAttempts && (
        <div className="game-over-buttons">
          <button 
            onClick={handleGamePayment}
            className="new-payment-button"
          >
            Make New Payment
          </button>
          <button 
            onClick={() => {
              setGameState(prev => ({
                ...prev,
                isGameOver: false,
                hasValidPayment: false
              }));
              setPaidGameAttempts(0);
            }}
            className="return-menu-button"
          >
            Return to Menu
          </button>
        </div>
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
            <h2>Get Ready!</h2>
            <p>Move your mouse to control the bucket</p>
            <p>Catch the tears to score points!</p>
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
