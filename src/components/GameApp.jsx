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
// import { JsonRpcProvider } from "@mysten/sui.js";

// Helper function to format a wallet address by truncating it
function formatWalletAddress(addr) {
  if (!addr) return 'Unknown';
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

const GameApp = () => {
  // Remove provider initialization
  // const provider = new JsonRpcProvider('https://fullnode.mainnet.sui.io:443');
  
  // Wallet and client hooks
  const wallet = useWallet();
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
    web2: [],
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
  const [usernameInput, setUsernameInput] = useState('');
  const [isUsernameSubmitted, setIsUsernameSubmitted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [useSuins, setUseSuins] = useState(false);
  const [suinsData, setSuinsData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Add this after other useState declarations (around line 70)
  const [selectedLeaderboards, setSelectedLeaderboards] = useState({
    free: 'main',
    paid: 'main'
  });
  
  // Add these new state variables at the top with other state declarations
  const [topScores, setTopScores] = useState([]);
  const [qualifyingTier, setQualifyingTier] = useState(null);
  
  // Add this state at the top with other state declarations
  const [primaryWalletBalance, setPrimaryWalletBalance] = useState(null);
  
  // Add this state for tracking qualification
  const [qualifiedForPaid, setQualifiedForPaid] = useState(false);
  
  // Add this state for all balances
  const [allBalances, setAllBalances] = useState({});
  
  // Add NFT state at the top of your component
  const [nfts, setNFTs] = useState([]);
  
  // Add this state at the top with other state declarations
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false);
  
  const SUINS_TYPE = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::suins_registration::SuinsRegistration";
  const SUINS_REGISTRY = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0";
  
  // Add cache state
  const [suinsCache, setSuinsCache] = useState({});
  
  // At the top of your component, add this log
  const client = new SuiClient({ 
    url: 'https://fullnode.mainnet.sui.io',
    network: 'mainnet' // Explicitly set the network
  });
  console.log('SUI Client initialized:', !!client);
  
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
  // Add this component near the top of your file
const TokenAmount = ({ amount, symbol }) => {
    const formatLargeNumber = (num, tokenSymbol) => {
        // Different conversion rates for different tokens
        let convertedAmount;
        if (tokenSymbol === 'SUI') {
            convertedAmount = Number(num) / 1e9; // SUI uses 9 decimals
        } else if (tokenSymbol === 'AYA') {
            convertedAmount = Number(num) / 1e6; // AYA uses 6 decimals (adjusted from 1e3)
        } else {
            convertedAmount = Number(num); // Default no conversion
        }

        const absNum = Math.abs(convertedAmount);
        
        // Show full number with appropriate decimals if less than 1000
        if (absNum < 1000) {
            return convertedAmount.toFixed(2);
        }

        const trillion = 1e12;
        const billion = 1e9;
        const million = 1e6;
        const thousand = 1e3;

        if (absNum >= trillion) {
            return (convertedAmount / trillion).toFixed(2) + 'T';
        } else if (absNum >= billion) {
            return (convertedAmount / billion).toFixed(2) + 'B';
        } else if (absNum >= million) {
            return (convertedAmount / million).toFixed(2) + 'M';
        } else if (absNum >= thousand) {
            return (convertedAmount / thousand).toFixed(2) + 'K';
        }
    };

    // Format the full amount for the tooltip with appropriate conversion
    const getFullAmount = (num, tokenSymbol) => {
        if (tokenSymbol === 'SUI') {
            return (Number(num) / 1e9).toFixed(2);
        } else if (tokenSymbol === 'AYA') {
            return (Number(num) / 1e6).toFixed(2); // Adjusted from 1e3 to 1e6
        }
        return Number(num).toFixed(2);
    };
    
    return (
        <div className="token-amount" title={`${getFullAmount(amount, symbol)} ${symbol}`}>
            {formatLargeNumber(amount, symbol)}
        </div>
    );
};

// Add this CSS to your stylesheet



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
    if (gameMode === 'free') {
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

  const handleScoreSubmit = async (finalScore) => {
    try {
        // Web2 submission for non-wallet users in free mode
        if (!wallet.connected && gameMode === 'free') {
            if (!playerName) {
                alert('Please enter a name before submitting your score');
                return;
            }

            console.log('Submitting to web2 leaderboard', {
                playerName: playerName,
                score: finalScore
            });
            
            const web2Endpoint = `${config.apiBaseUrl}/api/web2/scores`;
            const web2RequestBody = {
                playerName: playerName,
                score: Number(finalScore) // Use finalScore instead of gameState.score
            };

            console.log('Sending web2 request:', web2RequestBody);

            const response = await fetch(web2Endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify(web2RequestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Web2 submission failed: ${errorData.error}`);
            }

            const result = await response.json();
            console.log('Web2 score submission result:', result);
            
            await fetchLeaderboards();
            return;
        }

        // Existing wallet-connected logic
        if (!wallet.connected || !wallet.account) {
            alert('Please connect your wallet first');
            return;
        }

        let requestBody = {
            playerWallet: wallet.account.address,
            score: finalScore
        };

        // Handle paid mode submissions
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
        // Handle qualifying free scores that want to submit to paid leaderboard
        else if (qualifyingTier && qualifiedForPaid) {
            const tierConfig = config.scoreSubmissionTiers[qualifyingTier];
            if (!tierConfig) {
                throw new Error('Invalid qualifying tier');
            }

            // Handle payment first
            await handleGamePayment();
            if (!paymentStatus.verified || !paymentStatus.transactionId) {
                throw new Error('Payment failed');
            }

            requestBody = {
                ...requestBody,
                sessionToken: paymentStatus.transactionId,
                gameMode: 'paid'
            };
        } else {
            // Regular free mode submission (wallet connected) – include player's name
            requestBody = {
                ...requestBody,
                gameMode: 'free',
                playerName: playerName
            };
        }

        // Submit to both main and secondary leaderboards
        const submissions = ['main', 'secondary'].map(async (type) => {
            const endpoint = `${config.apiBaseUrl}/api/scores/${requestBody.gameMode}`;
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

        // Reset qualification states if this was a qualifying submission
        if (qualifyingTier && qualifiedForPaid) {
            setQualifiedForPaid(false);
            setQualifyingTier(null);
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
        const baseUrl = `${config.apiBaseUrl}/api`;
        
        // Fetch all leaderboard types with correct URL structure
        const [mainFree, secondaryFree, mainPaid, secondaryPaid, web2] = await Promise.all([
            fetch(`${baseUrl}/scores/leaderboard/main/free`),
            fetch(`${baseUrl}/scores/leaderboard/secondary/free`),
            fetch(`${baseUrl}/scores/leaderboard/main/paid`),
            fetch(`${baseUrl}/scores/leaderboard/secondary/paid`),
            fetch(`${baseUrl}/web2/leaderboard`)
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

        console.log('Fetched leaderboard data:', {
            mainFree,
            secondaryFree,
            mainPaid,
            secondaryPaid,
            web2
        });

        setLeaderboardData({
            mainFree,
            secondaryFree,
            mainPaid,
            secondaryPaid,
            web2
        });
    } catch (error) {
        console.error('Error fetching leaderboards:', error);
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

  // Update the getSuiNSName function to match the actual data structure
  const getSuiNSName = async (walletAddress) => {
    try {
      // Check cache first
      if (suinsCache[walletAddress]) {
        console.log('Using cached SUINS data');
        return suinsCache[walletAddress];
      }

      console.log('Fetching SUINS for wallet:', walletAddress);

      // Add delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch('https://fullnode.mainnet.sui.io/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'suix_getOwnedObjects',
          params: [
            walletAddress,
            {
              filter: {
                MoveModule: {
                  package: "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0",
                  module: "suins_registration"
                }
              },
              options: {
                showContent: true,
                showDisplay: true
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.result?.data && data.result.data.length > 0) {
        const suinsObject = data.result.data[0];
        const fields = suinsObject.data?.content?.fields;

        if (fields && fields.domain_name) {
          const result = {
            name: fields.domain_name,
            imageUrl: `https://api-mainnet.suins.io/nfts/${fields.domain_name}/${fields.expiration_timestamp_ms}`
          };
          
          // Cache the result
          setSuinsCache(prev => ({
            ...prev,
            [walletAddress]: result
          }));
          
          return result;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching SUINS:', error);
      if (error.message.includes('429')) {
        // If rate limited, try again after a longer delay
        await new Promise(resolve => setTimeout(resolve, 5000));
        return getSuiNSName(walletAddress);
      }
      return null;
    }
  };

  // Update SUINS for current user
  useEffect(() => {
    const updateDisplayName = async () => {
      if (wallet.connected && wallet.account) {
        try {
          const suiData = await getSuiNSName(wallet.account.address);
          if (suiData) {
            setSuinsData(suiData);
          } else {
            const truncatedAddress = `${wallet.account.address.slice(0, 6)}...${wallet.account.address.slice(-4)}`;
            setSuinsData({
              name: truncatedAddress,
              imageUrl: null
            });
          }
        } catch (error) {
          console.error('Error updating display name:', error);
          const truncatedAddress = `${wallet.account.address.slice(0, 6)}...${wallet.account.address.slice(-4)}`;
          setSuinsData({
            name: truncatedAddress,
            imageUrl: null
          });
        }
      } else {
        setSuinsData(null);
      }
    };

    updateDisplayName();
  }, [wallet.connected, wallet.account]);

  // Remove any other declarations of getDisplayName and keep just this one
  const getDisplayName = (wallet) => {
    const suinsData = suinsCache[wallet];
    const truncatedWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : '';
    
    return (
      <div className="player-name" style={{ position: 'relative' }}>
        {suinsData?.imageUrl && (
          <img 
            src={suinsData.imageUrl}
            alt="SUINS avatar"
            className="suins-avatar"
          />
        )}
        <span>{suinsData ? suinsData.name : truncatedWallet}</span>
        <div className="wallet-tooltip" style={{
          position: 'absolute',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          visibility: 'hidden',
          opacity: 0,
          transition: 'opacity 0.2s',
          top: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none'
        }}>
          {wallet}
        </div>
      </div>
    );
  };

  // Update SUINS for leaderboard entries
  useEffect(() => {
    const updateLeaderboardNames = async () => {
      // Get top 10 from each leaderboard
      const topWallets = new Set([
        ...leaderboardData.mainFree.slice(0, 10).map(entry => entry.playerWallet),
        ...leaderboardData.mainPaid.slice(0, 10).map(entry => entry.playerWallet)
      ]);

      // Update SUINS for each unique wallet
      for (const wallet of topWallets) {
        if (!suinsCache[wallet]) {
          await getSuiNSName(wallet);
        }
      }
    };

    if (leaderboardData.mainFree.length > 0 || leaderboardData.mainPaid.length > 0) {
      updateLeaderboardNames();
    }
  }, [leaderboardData.mainFree, leaderboardData.mainPaid]);

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

  // Attach the game-over handler once after the game manager has been initialized
  useEffect(() => {
    if (window.gameManager) {
      window.gameManager.onGameOver = async (finalScore) => {
        console.log('Game Over triggered with score:', finalScore);

        setGameState(prev => ({
          ...prev,
          score: finalScore,
          isGameOver: true,
          gameStarted: false,
        }));

        try {
          // Handle free mode submissions
          if (gameMode === 'free') {
            if (!wallet.connected) {
              console.log('Submitting to web2 leaderboard with score:', finalScore);
              await handleScoreSubmit(finalScore);
            } else {
              // For wallet connected free mode, submit score and then check for qualification
              await handleScoreSubmit(finalScore);
              const qualification = await checkScoreQualification(finalScore);
              if (qualification) {
                console.log('Score qualifies for paid leaderboard:', qualification);
                setQualifiedForPaid(true);
                setQualifyingTier(qualification);
              }
            }
          } else if (gameMode === 'paid' && wallet.connected) {
            await handleScoreSubmit(finalScore);
          }
        } catch (error) {
          console.error('Error in game over handler:', error);
        }
      };
    }
  }, [gameMode, wallet.connected]);

  // Add this function to check if user can afford a tier
  const canAffordTier = (tierAmount) => {
    const balanceInMist = BigInt(balance ?? 0);
    return balanceInMist >= BigInt(tierAmount);
  };

  // Update the SUI price fetching function
  useEffect(() => {
    const fetchSuiPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
        const data = await response.json();
        setSuiPrice(data.sui.usd);
    } catch (error) {
        console.error('Error fetching SUI price:', error);
        setSuiPrice(null);
      }
    };
    
    fetchSuiPrice();
    const interval = setInterval(fetchSuiPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Modify handleGamePayment to use selected tier
  const handleGamePayment = async () => {
    console.log('Payment handler state:', {
        walletConnected: wallet.connected,
        walletAccount: wallet.account,
        selectedTier: selectedTier,
        qualifyingTier: qualifyingTier,
        gameMode: gameMode
    });

    // Use different tier configs based on context
    const tierToUse = selectedTier || qualifyingTier;
    
    if (!wallet.connected || !tierToUse) {
        console.log('Wallet or tier check failed:', {
            walletConnected: wallet.connected,
            tierToUse: tierToUse
        });
        alert('Please connect wallet and select a payment tier');
        return;
    }

    // Use different tier configurations based on the game mode
    const tierConfig = gameMode === 'free' ? 
        config.scoreSubmissionTiers[qualifyingTier] : 
        config.paymentTiers[selectedTier];

    if (!tierConfig) {
        console.error('Invalid tier configuration:', {
            tierToUse,
            gameMode,
            availableTiers: gameMode === 'free' ? config.scoreSubmissionTiers : config.paymentTiers
        });
        alert('Invalid payment tier configuration');
        return;
    }

    try {
        console.log('Starting game payment for tier:', tierToUse);
        const recipients = config.getCurrentRecipients();
        const totalAmount = tierConfig.amount;
        
        // Calculate amounts based on shares
        const primaryAmount = Math.floor(totalAmount * (config.shares.primary / 10000));
        const secondaryAmount = Math.floor(totalAmount * (config.shares.secondary / 10000));
        const tertiaryAmount = Math.floor(totalAmount * (config.shares.tertiary / 10000));
        const rewardsAmount = Math.floor(totalAmount * (config.shares.rewards / 10000));
        
        const txb = new TransactionBlock();
        
        // Split the coins for all recipients
        const [primaryCoin, secondaryCoin, tertiaryCoin, rewardsCoin] = txb.splitCoins(
          txb.gas,
          [primaryAmount, secondaryAmount, tertiaryAmount, rewardsAmount]
        );

        // Transfer to all recipients
        txb.transferObjects([primaryCoin], txb.pure(recipients.primary));
        txb.transferObjects([secondaryCoin], txb.pure(recipients.secondary));
        txb.transferObjects([tertiaryCoin], txb.pure(recipients.tertiary));
        txb.transferObjects([rewardsCoin], txb.pure(recipients.rewards));

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
    fetchLeaderboards(); // Initial fetch only
  }, []); // No interval, just fetch once on mount

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
  
  // Add this function to check score qualification
const checkScoreQualification = async (score) => {
    try {
        // Use the correct URL pattern for the main paid leaderboard
        const response = await fetch(`${config.apiBaseUrl}/api/scores/leaderboard/secondary/paid`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const leaderboardData = await response.json();
        setTopScores(leaderboardData);

        // Compare against paid leaderboard scores
        if (leaderboardData.length === 0 || score > leaderboardData[0].score) {
            return 'firstPlace';
        } else if (score > leaderboardData[2]?.score) {
            return 'topThree';
        } else if (score > leaderboardData[7]?.score) {
            return 'topEight';
        }
        return null;
    } catch (error) {
        console.error('Error checking score qualification:', error);
        return null;
    }
};




// Modify fetchPrimaryWalletBalance to set all balances
const fetchPrimaryWalletBalance = async () => {
    console.log('fetchPrimaryWalletBalance called');

    try {
        // Set default network context
        config.updateNetwork('mainnet');
        
        const recipients = config.getCurrentRecipients();
        console.log('Recipients from config:', recipients);
        
        if (!recipients?.primary) {
            console.error('Primary recipient address is undefined or null');
            return;
        }

        console.log('Attempting to fetch from address:', recipients.primary);

        // Test the client connection
        try {
            const testConnection = await client.getChainIdentifier();
            console.log('Client connection test:', testConnection);
        } catch (e) {
            console.error('Client connection test failed:', e);
        }

        // Fetch both coins and NFTs
        const [allCoins, allNFTs] = await Promise.all([
            client.getAllCoins({ owner: recipients.primary }),
            client.getOwnedObjects({
                owner: recipients.primary,
                options: { showContent: true }
            })
        ]);

        console.log('Raw coin response:', allCoins);
        console.log('Raw NFT response:', allNFTs);
        
        let totalSuiBalance = BigInt(0);
        const balancesByCoin = {};
        const nfts = [];

        // Process coins
        for (const coin of allCoins.data) {
            const coinType = coin.coinType;
            const balance = BigInt(coin.balance);
            
            if (coinType === '0x2::sui::SUI') {
                totalSuiBalance += balance;
            }
            
            const parts = coinType.split('::');
            const symbol = parts.length >= 3 ? parts[2] : coinType;
            
            if (balancesByCoin[symbol]) {
                balancesByCoin[symbol] = balancesByCoin[symbol] + balance;
            } else {
                balancesByCoin[symbol] = balance;
            }
        }

        // Process NFTs
        for (const nft of allNFTs.data) {
            if (nft.data?.content?.type?.includes('::nft::')) {
                nfts.push({
                    id: nft.data.objectId,
                    type: nft.data.content.type,
                    name: nft.data.content.fields?.name || 'Unnamed NFT',
                    description: nft.data.content.fields?.description,
                    url: nft.data.content.fields?.url
                });
            }
        }
        
        console.log('Final balances:', {
            totalSui: totalSuiBalance.toString(),
            byCoin: balancesByCoin,
            nfts: nfts
        });

        setAllBalances(balancesByCoin);
        setPrimaryWalletBalance(totalSuiBalance);
        setNFTs(nfts);
        
    } catch (error) {
        console.error('Balance check error:', error);
        setPrimaryWalletBalance(null);
        setAllBalances({});
        setNFTs([]);
    }
};


useEffect(() => {
  fetchPrimaryWalletBalance(); // Initial fetch
  const interval = setInterval(fetchPrimaryWalletBalance, 60000); // Update every minute
  return () => clearInterval(interval);
}, []);

const resetGameState = () => {
    if (window.gameManager) {
        window.gameManager.cleanup();
        window.gameManager.initGame(); // Reinitialize the game manager
    }
    
    setGameState({
        gameStarted: false,
        score: 0,
        isGameOver: false,
        hasValidPayment: false
    });
    
    setQualifyingTier(null);
    setQualifiedForPaid(false);
    setPaidGameAttempts(0);
    setMaxAttempts(0);
    setSelectedTier(null);
};

const handlePaidGameAttempt = () => {
    const newAttempts = paidGameAttempts + 1;
    setPaidGameAttempts(newAttempts);
    
    if (newAttempts >= maxAttempts) {
        setGameState(prev => ({
            ...prev,
            hasValidPayment: false
        }));
        alert('All paid attempts used. Please make a new payment to continue playing.');
    }
};

const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (usernameInput.trim() && usernameInput.length <= 25) {
        setPlayerName(usernameInput);
        setIsUsernameSubmitted(true);
    } else {
        alert('Please enter a valid username (max 25 characters).');
    }
};

const handleGameModeSelection = (mode) => {
    setGameMode(mode);
    if (mode === 'paid' && !wallet.connected) {
      alert('Please connect your wallet to play in paid mode.');
    }
};

// Add handleUsernameChange function
const handleUsernameChange = () => {
    setIsUsernameSubmitted(false);
    setUsernameInput('');
    setUseSuins(false);
    setGameMode(null); // Reset game mode when changing username
};



// Update the checkbox handler
const handleSuinsChange = (e) => {
  const checked = e.target.checked;
  setUseSuins(checked);
  if (checked && suinsData?.name) {
    setPlayerName(suinsData.name);
  } else {
    setPlayerName(usernameInput);
  }
};

  // Render method
  return (
    
     <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {usernameInput && usernameInput.length > 0 && (
        <div className={`player-display ${gameState.gameStarted ? 'fade-out' : ''}`}>
          Playing as: 
          <span className="player-name">
            {suinsData?.imageUrl && (
              <img 
                src={suinsData.imageUrl} 
                alt="SUINS avatar" 
                className="suins-avatar"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  marginRight: '5px',
                  verticalAlign: 'middle'
                }}
              />
            )}
            <span>{playerName}</span>
          </span>
        </div>
      )}
      {(!gameState.gameStarted && (paidGameAttempts >= maxAttempts || !gameState.hasValidPayment)) && (
        <header>
          <div className="title">Tears of Aya</div>
          <div className="username-input-container">
            {!isUsernameSubmitted ? (
              <form onSubmit={handleUsernameSubmit}>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="username-input"
                  maxLength={25} // Restrict to 25 characters
                  required
                />
                <button type="submit">Submit</button>
              </form>
            ) : (
              <div>
                <h2>Welcome, {useSuins && suinsData ? suinsData.name : playerName}!</h2>
                <div>
                  <button onClick={handleUsernameChange}>Change Username</button>
                  <label>
                    <input
                      type="checkbox"
                      checked={useSuins}
                      onChange={handleSuinsChange}
                    />
                    use SUINS name.
                  </label>
                </div>
              </div>
            )}
          </div>

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

          <div className="wallet-info">
            <div 
              className="assets-header" 
              onClick={() => setIsAssetsExpanded(!isAssetsExpanded)}
            >
              <h3>Prize Pool Assets</h3>
              <span className={`dropdown-arrow ${isAssetsExpanded ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>
            
            <div className={`assets-content ${isAssetsExpanded ? 'expanded' : ''}`}>
              <div className="balance-list">
                {Object.entries(allBalances).map(([symbol, balance]) => {
                  console.log('Rendering balance:', symbol, balance);
                  return (
                    <p key={symbol} className="balance-item">
                      <TokenAmount amount={balance} symbol={symbol} /> {symbol}
                    </p>
                  );
                })}
              </div>
              {nfts.length > 0 && (
                <>
                  <h3>NFTs:</h3>
                  <div className="nft-list">
                    {nfts.map((nft) => (
                      <div key={nft.id} className="nft-item">
                        {nft.url && (
                          <img 
                            src={nft.url} 
                            alt={nft.name} 
                            className="nft-image"
                          />
                        )}
                        <p>{nft.name}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

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

          <h2>Select Game Mode</h2>
          <div className="mode-selector">
            <button 
              onClick={() => handleGameModeSelection('free')} 
              className={gameMode === 'free' ? 'active' : ''}
            >
              Free Mode
            </button>
            <button 
              onClick={() => handleGameModeSelection('paid')} 
              className={gameMode === 'paid' ? 'active' : ''}
            >
              Paid Mode
            </button>
          </div>

          {wallet.connected && gameMode === 'paid' && gameState.hasValidPayment && (
            <div className="attempts-info">
              <p>Attempts remaining: {maxAttempts - paidGameAttempts}</p>
            </div>
          )}

          {isUsernameSubmitted && gameMode === 'free' && (
            <button 
              onClick={handleGameStart}
              className="start-button"
            >
              Start Free Game
            </button>
          )}

          {!gameState.hasValidPayment && wallet.connected && gameMode === 'paid' && (
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
          )}
        </header>
      )}

      <canvas id="tearCatchGameCanvas" className={`game-canvas ${gameState.gameStarted ? 'centered-canvas' : ''}`} />

      {gameState.isGameOver && (
  <div className="game-over-overlay">
    <div className="game-over-popup">
      <h2>Game Over!</h2>
      <p>Final Score: {gameState.score}</p>
      
      {/* Only show qualification notice if wallet is connected */}
      {gameMode === 'free' && qualifyingTier && wallet.connected && (
        <div className="qualification-notice">
          <h3>Congratulations! Your score qualifies for the paid leaderboard!</h3>
          <p>Would you like to submit your score to the paid leaderboard?</p>
          <button 
            onClick={handleGamePayment}
            className="submit-paid-button"
          >
            Submit Score ({formatSUI(config.scoreSubmissionTiers[qualifyingTier].amount)} SUI)
          </button>
        </div>
      )}

      {/* Game over buttons */}
      <div className="game-over-buttons">
        <button 
          onClick={() => {
            resetGameState();
            restartGame();
          }}
          className="restart-button"
        >
          Play Again
        </button>
        <button 
          onClick={() => {
            resetGameState();
          }}
          className="return-menu-button"
        >
          Return to Menu
        </button>
      </div>
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
              <div className="leaderboard-section">
                <h2>Free Leaderboards</h2>
                <select 
                  className="leaderboard-type-selector"
                  value={selectedLeaderboards.free}
                  onChange={(e) => setSelectedLeaderboards(prev => ({
                    ...prev,
                    free: e.target.value
                  }))}
                >
                  <option value="main">All Time Leaderboard</option>
                  <option value="secondary">Weekly Leaderboard</option>
                  <option value="web2">Normal Players</option>
                </select>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player Name</th>
                      <th>Wallet</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLeaderboards.free === 'web2' ? (
                      leaderboardData.web2.slice(0, 10).map((entry, index) => (
                        <tr key={index} className={`rank-${index + 1}`}>
                          <td>{index + 1}</td>
                          <td className="playername-cell">{entry.playerName}</td>
                          <td className="score-cell">{entry.score}</td>
                        </tr>
                      ))
                    ) : (
                      leaderboardData[`${selectedLeaderboards.free}Free`].slice(0, 10).map((entry, index) => (
                        <tr key={index} className={`rank-${index + 1}`}>
                          <td>{index + 1}</td>
                          <td className="playername-cell">{entry.playerName}</td>
                          <td className="wallet-cell">
                          {getDisplayName(entry.playerWallet)}
                          </td>
                          <td className="score-cell">{entry.score}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="leaderboard-section">
                <h2>Paid Leaderboards</h2>
                <select 
                  className="leaderboard-type-selector"
                  value={selectedLeaderboards.paid}
                  onChange={(e) => setSelectedLeaderboards(prev => ({
                    ...prev,
                    paid: e.target.value
                  }))}
                >
                  <option value="main">All Time Leaderboard</option>
                  <option value="secondary">Weekly Leaderboard</option>
                </select>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Player Name</th>
                      <th>Wallet</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData[`${selectedLeaderboards.paid}Paid`].slice(0, 10).map((entry, index) => (
                      <tr key={index} className={`rank-${index + 1}`}>
                        <td>{index + 1}</td>
                        <td className="playername-cell">{entry.playerName}</td>
                        <td className="wallet-cell">
                        {getDisplayName(entry.playerWallet)}
                        </td>
                        <td className="score-cell">{entry.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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