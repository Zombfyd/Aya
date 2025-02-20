import { gameManager } from '../game/GameManager.js';
import { BloodGameManager } from '../game/assets/BloodGameManager.js';

// Initialize both game managers
const gameManager1 = gameManager;
const gameManager2 = new BloodGameManager();

window.gameManager = gameManager1;
window.GameManager2 = gameManager2;
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
import { TransactionBlock } from '@mysten/sui.js/builder';
import { SuiClient } from '@mysten/sui.js/client';
import { getFullnodeUrl } from '@mysten/sui.js/utils';
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
  const [gameState, setGameState] = useState({
    gameStarted: false,
    score: 0,
    isGameOver: false,
    hasValidPayment: false
  });
  const [leaderboardData, setLeaderboardData] = useState({
    mainFreeTOA: [],
    secondaryFreeTOA: [],
    mainPaidTOA: [],
    secondaryPaidTOA: [],
    mainFreeTOB: [],
    secondaryFreeTOB: [],
    mainPaidTOB: [],
    secondaryPaidTOB: [],
    web2TOA: [],
    web2TOB: []
  });
  const [gameMode, setGameMode] = useState('free');
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({
    verified: false,
    transactionId: null,
    error: null,
    amount: null,
    timestamp: null,
    recipient: null
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
  const [playerName, setPlayerName] = useState('');
  const [isUsernameSubmitted, setIsUsernameSubmitted] = useState(false);
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
    url: getFullnodeUrl('mainnet')
  });
  
  // Add this state near the top of your file
  const [showGameInfoPopup, setShowGameInfoPopup] = useState(true);
  
  // First, add a new state for the checkbox
  const [neverShowTutorial, setNeverShowTutorial] = useState(false);
  
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

  // Add TokenAmount component
  const TokenAmount = ({ amount, symbol }) => {
    const formatLargeNumber = (num, tokenSymbol) => {
      // Different conversion rates for different tokens
      let convertedAmount;
      if (tokenSymbol === 'SUI') {
        convertedAmount = Number(num) / 1e9; // SUI uses 9 decimals
      } else {
        convertedAmount = Number(num) / 1e6; // Default no conversion
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

  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Initialize both game managers
        const manager1Success = await gameManager1.initialize();
        const manager2Success = await gameManager2.initialize();

        if (manager1Success && manager2Success) {
          setGameManagerInitialized(true);
          window.gameManager1 = gameManager1;
          window.gameManager2 = gameManager2;
        } else {
          console.error('Failed to initialize game managers');
        }
      } catch (error) {
        console.error('Error initializing game:', error);
      }
    };

    initializeGame();
  }, []);

  // Modify payment status monitoring
  useEffect(() => {
    if (transactionInProgress) {
        const checkPaymentStatus = async () => {
            try {
                if (paymentStatus.transactionId) {
                    // Use SuiClient to check transaction status
                    const status = await client.getTransactionBlock({
                        digest: paymentStatus.transactionId,
                        options: {
                            showEffects: true,
                            showEvents: true,
                        }
                    });

                    if (status && status.digest) {
                        console.log('Transaction confirmed:', status);
                        
                        // Update states only after confirmation
                        setPaymentStatus(prev => ({
                            ...prev,
                            verified: true
                        }));
                        
                        setGameState(prev => ({
                            ...prev,
                            hasValidPayment: true
                        }));
                        
                        
                        
                        setTransactionInProgress(false);
                        setPaying(false);

                        // Start game with type that was selected during payment
                        startGame(window.selectedGameType || 'aya');
                    }
                }
            } catch (error) {
                console.error('Payment status check failed:', error);
                setTransactionInProgress(false);
                setPaying(false);
                alert('Failed to verify payment. Please try again.');
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
  const handleGameStart = async (type = 'aya') => {
    if (gameMode === 'free') {
      startGame(type);
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

        if (response.digest) {
          console.log('Transaction successful');
          setPaymentStatus(prev => ({
            ...prev,
            verified: true,
            transactionId: response.digest
          }));
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
      startGame(type);
    }
  };

  // First, update handleScoreSubmit to submit to both main and secondary
  const handleScoreSubmit = async (finalScore, submissionGameMode = gameMode, gameType, paymentDetails = null) => {
    const currentGame = gameType || (window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB');
    
    console.log('handleScoreSubmit received:', { 
        finalScore, 
        playerName, 
        gameMode: submissionGameMode,
        game: currentGame,
        walletConnected: wallet.connected,
        paymentStatus
    });

    try {
        let endpoint;
        let requestBody;

        if (!wallet.connected) {
            // Web2 submission - specific to the game played
            endpoint = `${config.apiBaseUrl}/api/web2/scores`;
            requestBody = {
                playerName,
                score: finalScore,
                game: currentGame // Ensures score goes to correct game leaderboard
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`Web2 score submitted successfully for ${currentGame}:`, result);
            return result;

        } else {
            // Enhanced verification for paid submissions
            if (submissionGameMode === 'paid') {
                // Check both state and passed payment details
                const verifiedPayment = paymentDetails || paymentStatus;
                if (!verifiedPayment.verified || !verifiedPayment.transactionId) {
                    throw new Error('Payment verification failed - no valid payment found');
                }
            }

            // Submit score with verification data
            endpoint = `${config.apiBaseUrl}/api/scores/${submissionGameMode}`;
            
            const submissions = ['main', 'secondary'].map(async (gameType) => {
                const body = {
                    playerWallet: wallet.account?.address,
                    score: finalScore,
                    gameType: gameType,
                    playerName: playerName || null,
                    game: currentGame,
                    paymentVerification: submissionGameMode === 'paid' ? {
                        transactionId: paymentDetails?.transactionId,
                        amount: paymentDetails?.amount,
                        timestamp: paymentDetails?.timestamp,
                        recipient: paymentDetails?.recipient
                    } : null
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                return response.json();
            });

            const [mainResult, secondaryResult] = await Promise.all(submissions);
            console.log(`Scores submitted successfully for ${currentGame}:`, { 
                main: mainResult, 
                secondary: secondaryResult 
            });
            await fetchLeaderboards();
            return { main: mainResult, secondary: secondaryResult };
        }
    } catch (error) {
        console.error(`Error submitting score for ${currentGame}:`, error);
        alert(`Failed to submit score for ${currentGame}: ${error.message}`);
        throw error;
    }
};

  // Update the fetchLeaderboards function
  const fetchLeaderboards = async () => {
    console.log('Fetching leaderboards...');
    setIsLeaderboardLoading(true);
    try {
        const baseUrl = `${config.apiBaseUrl}/api`;

        const fetchLeaderboard = async (endpoint) => {
            const response = await fetch(`${baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for endpoint: ${endpoint}`);
            }
            return response.json();
        };

        // Fetch all leaderboards with separate TOA and TOB endpoints
        const [
            mainFreeTOA,
            secondaryFreeTOA,
            mainFreeTOB,
            secondaryFreeTOB,
            mainPaidTOA,
            secondaryPaidTOA,
            mainPaidTOB,
            secondaryPaidTOB,
            web2TOA,        
            web2TOB         
        ] = await Promise.all([
            fetchLeaderboard('/scores/leaderboard/main/free?game=TOA'),
            fetchLeaderboard('/scores/leaderboard/secondary/free?game=TOA'),
            fetchLeaderboard('/scores/leaderboard/main/free?game=TOB'),
            fetchLeaderboard('/scores/leaderboard/secondary/free?game=TOB'),
            fetchLeaderboard('/scores/leaderboard/main/paid?game=TOA'),
            fetchLeaderboard('/scores/leaderboard/secondary/paid?game=TOA'),
            fetchLeaderboard('/scores/leaderboard/main/paid?game=TOB'),
            fetchLeaderboard('/scores/leaderboard/secondary/paid?game=TOB'),
            fetchLeaderboard('/web2/leaderboard?game=TOA'),  // Web2 TOA leaderboard
            fetchLeaderboard('/web2/leaderboard?game=TOB')   // Web2 TOB leaderboard
        ]);

        setLeaderboardData({
            mainFreeTOA,
            secondaryFreeTOA,
            mainFreeTOB,
            secondaryFreeTOB,
            mainPaidTOA,
            secondaryPaidTOA,
            mainPaidTOB,
            secondaryPaidTOB,
            web2TOA,    // Store TOA web2 scores separately
            web2TOB     // Store TOB web2 scores separately
        });

    } catch (error) {
        console.error('Error fetching leaderboards:', error);
        setLeaderboardData({
            mainFreeTOA: [],
            secondaryFreeTOA: [],
            mainFreeTOB: [],
            secondaryFreeTOB: [],
            mainPaidTOA: [],
            secondaryPaidTOA: [],
            mainPaidTOB: [],
            secondaryPaidTOB: [],
            web2TOA: [], // Empty array for TOA web2 scores on error
            web2TOB: []  // Empty array for TOB web2 scores on error
        });
    } finally {
        setIsLeaderboardLoading(false);
    }
};

  // Update the useEffect for leaderboard fetching
  useEffect(() => {
    console.log('Initial leaderboard fetch');
    fetchLeaderboards();
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      console.log('Refreshing leaderboards');
      fetchLeaderboards();
    }, 30000); // Refresh every 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount

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
        if (suinsCache[walletAddress]) {
            console.log('Using cached SUINS data');
            return suinsCache[walletAddress];
        }

        console.log('Fetching SUINS for wallet:', walletAddress);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: objects } = await client.getOwnedObjects({
            owner: walletAddress,
            filter: {
                MatchAll: [
                    { Package: SUINS_REGISTRY },
                    { Module: "suins_registration" }
                ]
            },
            options: {
                showType: true,
                showContent: true,
                showDisplay: true
            }
        });

        if (objects && objects.length > 0) {
            const suinsObject = objects[0];
            const fields = suinsObject.data?.content?.fields;

            if (fields && fields.domain_name) {
                const result = {
                    name: fields.domain_name,
                    imageUrl: `https://api-mainnet.suins.io/nfts/${fields.domain_name}/${fields.expiration_timestamp_ms}`
                };
                
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
        ...leaderboardData.mainFreeTOA.slice(0, 10).map(entry => entry.playerWallet),
        ...leaderboardData.mainPaidTOA.slice(0, 10).map(entry => entry.playerWallet)
      ]);

      // Update SUINS for each unique wallet
      for (const wallet of topWallets) {
        if (!suinsCache[wallet]) {
          await getSuiNSName(wallet);
        }
      }
    };

    if (leaderboardData.mainFreeTOA.length > 0 || leaderboardData.mainPaidTOA.length > 0) {
      updateLeaderboardNames();
    }
  }, [leaderboardData.mainFreeTOA, leaderboardData.mainPaidTOA]);

  // Game restart function
  const restartGame = (type = 'aya') => {
    if (!gameManagerInitialized) {
      console.error('Cannot restart game - game managers not initialized');
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

    // Clean up the active game manager
    if (window.activeGameManager) {
      window.activeGameManager.cleanup();
    }

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        gameStarted: true
      }));
      
      if (window.activeGameManager) {
        console.log(`Restarting game in ${gameMode} mode, type: ${type}`);
        startGame(type);
      }
    }, 100);
  };

  // Update startGame to track bucket click state
  const startGame = async (type = 'aya') => {
    if (!window.gameManager1 && !window.gameManager2) {
      console.error('Game managers not found');
      alert('Game initialization failed. Please refresh the page and try again.');
      return;
    }

    // For paid mode, verify we have attempts left
    if (gameMode === 'paid') {
      if (paidGameAttempts >= maxAttempts) {
        alert('All paid attempts used. Please make a new payment to continue playing.');
        setGameState(prev => ({ ...prev, hasValidPayment: false }));
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

      // Track attempts for paid games
      const canvas = document.getElementById('tearCatchGameCanvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scrollTop = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }

      // Choose which game manager to use based on type
      const activeManager = type === 'aya' ? gameManager1 : gameManager2;
      window.activeGameManager = activeManager;

      console.log(`Starting game in ${gameMode} mode, type: ${type}`);
      
      // Start countdown from 3
      setCountdown(3);
      
      // Wait for countdown to complete
      await new Promise((resolve) => {
        let count = 3;
        const countdownInterval = setInterval(() => {
          count--;
          setCountdown(count);
          
          if (count <= 0) {
            clearInterval(countdownInterval);
            setCountdown(null);
            resolve();
          }
        }, 1000);
      });

      // Start the game after countdown
      activeManager.startGame(gameMode);
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

  // Update the onGameOver callback to wait for user choice
  useEffect(() => {
    const setupGameOver = (manager, gameType) => {
        if (manager) {
            manager.onGameOver = async (finalScore) => {
                console.log('Game Over triggered with score:', finalScore, 'for game type:', gameType);

                // First, just set the game state and score
                setGameState(prev => ({
                    ...prev,
                    score: finalScore,
                    isGameOver: true,
                    gameStarted: false,
                }));

                try {
                    // If not connected to wallet, submit to Web2 directly
                    if (!wallet.connected) {
                        await handleScoreSubmit(finalScore, 'free', gameType);
                        return;
                    }

                    // If in paid mode, submit to paid leaderboard
                    if (gameMode === 'paid') {
                        // Submit score with current payment status
                        await handleScoreSubmit(finalScore, 'paid', gameType, paymentStatus);
                        await handlePaidGameAttempt();
                        // Check if this was the last attempt
                        if (paidGameAttempts >= maxAttempts) {
                            setGameState(prev => ({
                                ...prev,
                                hasValidPayment: false
                            }));
                        }
                        return;
                    }

                    // If in free mode with wallet connected, check qualification
                    if (gameMode === 'free' && wallet.connected) {
                        const qualificationResult = await checkScoreQualification(finalScore, gameType);
                        if (qualificationResult) {
                            setQualifiedForPaid(true);
                            setQualifyingTier(qualificationResult);
                        } else {
                            setQualifiedForPaid(false);
                            setQualifyingTier(null);
                            // Submit to free leaderboard automatically if they don't qualify
                            await handleScoreSubmit(finalScore, 'free', gameType);
                        }
                    }
                } catch (error) {
                    console.error('Error handling game over:', error);
                    alert('Failed to submit score. Please try again.');
                }
            };
        }
    };

    // Set up game over handlers for both game types
    setupGameOver(window.gameManager1, 'TOA');
    setupGameOver(window.gameManager2, 'TOB');
}, [gameMode, wallet.connected, handleScoreSubmit, paymentStatus, paidGameAttempts, maxAttempts]);

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

  // Modify handleGamePayment
  const handleGamePayment = async (type = 'aya') => {
    console.log('Payment handler state:', {
        walletConnected: wallet.connected,
        walletAccount: wallet.account,
        selectedTier: selectedTier,
        qualifyingTier: qualifyingTier,
        gameMode: gameMode,
        gameType: type
    });

    const tierToUse = selectedTier || qualifyingTier;
    
    if (!wallet.connected || !tierToUse) {
        alert('Please connect wallet and select a payment tier');
        return;
    }

    setTransactionInProgress(true);
    setPaying(true);
    
    try {
        window.selectedGameType = type;

        const tierConfig = gameMode === 'free' ? 
            config.scoreSubmissionTiers[qualifyingTier] : 
            config.paymentTiers[selectedTier];

        if (!tierConfig) {
            throw new Error('Invalid tier configuration');
        }

        const recipients = config.getCurrentRecipients();
        const totalAmount = tierConfig.amount;
        
        // Calculate amounts based on shares
        const primaryAmount = Math.floor(totalAmount * (config.shares.primary / 10000));
        const secondaryAmount = Math.floor(totalAmount * (config.shares.secondary / 10000));
        const tertiaryAmount = Math.floor(totalAmount * (config.shares.tertiary / 10000));
        const rewardsAmount = Math.floor(totalAmount * (config.shares.rewards / 10000));
        
        const txb = new TransactionBlock();
        
        // Split the coins for all recipients using the updated API
        const [primaryCoin, secondaryCoin, tertiaryCoin, rewardsCoin] = txb.splitCoins(
            txb.gas,
            [primaryAmount, secondaryAmount, tertiaryAmount, rewardsAmount]
        );

        // Transfer to all recipients using the updated API
        txb.transferObjects([primaryCoin], recipients.primary);
        txb.transferObjects([secondaryCoin], recipients.secondary);
        txb.transferObjects([tertiaryCoin], recipients.tertiary);
        txb.transferObjects([rewardsCoin], recipients.rewards);

        // Execute transaction with the updated API
        const response = await wallet.signAndExecuteTransactionBlock({
            transactionBlock: txb,
            chain: 'mainnet',
            options: { 
                showEffects: true,
                showEvents: true,
                showInput: true,
                showObjectChanges: true
            }
        });

        if (!response?.digest) {
            throw new Error('Transaction failed - no digest received');
        }

        console.log('Transaction completed:', response);

        const paymentDetails = {
            verified: true,
            transactionId: response.digest,
            amount: totalAmount,
            timestamp: Date.now(),
            recipient: recipients.primary
        };

        setPaymentStatus(paymentDetails);
        setMaxAttempts(tierConfig.plays);
        setPaidGameAttempts(0);
        setGameState(prev => ({
            ...prev,
            hasValidPayment: true
        }));

    } catch (error) {
        console.error('Payment error:', error);
        alert(`Payment failed: ${error.message}`);
        setTransactionInProgress(false);
        setPaying(false);
        window.selectedGameType = null;
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
  
  // Update checkScoreQualification with corrected comparison logic
  const checkScoreQualification = async (score, game) => {
    try {
        console.log(`Checking qualification for game ${game} with score ${score}`);
        
        const endpoint = `${config.apiBaseUrl}/api/scores/leaderboard/secondary/paid?game=${game}`;
        console.log('Checking against weekly paid leaderboard:', endpoint);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const leaderboardData = await response.json();
        console.log(`Current ${game} weekly paid leaderboard:`, {
            totalEntries: leaderboardData.length,
            topScore: leaderboardData[0]?.score,
            thirdPlace: leaderboardData[2]?.score,
            eighthPlace: leaderboardData[7]?.score
        });

        // Corrected logic
        let qualificationTier = null;
        if (leaderboardData.length === 0) {
            qualificationTier = 'firstPlace';
        } else if (score > leaderboardData[0]?.score) {
            qualificationTier = 'firstPlace';
        } else if (score > leaderboardData[2]?.score) {
            qualificationTier = 'topThree';
        } else if (score > leaderboardData[7]?.score) {
            qualificationTier = 'topEight';
        }

        setTopScores(leaderboardData);
        return qualificationTier;
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
    if (window.gameManager1) {
        window.gameManager1.cleanup();
        window.gameManager1.initGame(); // Reinitialize the game manager
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
    
    // Only show the warning after their last game is finished
    if (newAttempts === maxAttempts) {
        setTimeout(() => {
            alert('You have used all your paid attempts. Please make a new payment to continue playing.');
            setGameState(prev => ({
                ...prev,
                hasValidPayment: false
            }));
        }, 1000); // Small delay to ensure game over screen shows first
    }
};

const handleUsernameChange = (e) => {
    setPlayerName(e.target.value);
};

const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim() && playerName.length <= 25) {
        setIsUsernameSubmitted(true);
    }
};

const handleGameModeSelection = (mode) => {
    setGameMode(mode);
    if (mode === 'paid' && !wallet.connected) {
      alert('Please connect your wallet to play in paid mode.');
    }
};

// Update the checkbox handler
const handleSuinsChange = (e) => {
  const checked = e.target.checked;
  setUseSuins(checked);
  if (checked && suinsData?.name) {
    setPlayerName(suinsData.name);
  } else {
    setPlayerName(playerName);
  }
};

  // Move the cleanup useEffect inside the component
  useEffect(() => {
    return () => {
      // Cleanup event listeners for both game managers
      if (window.gameManager1) {
        window.gameManager1.cleanup();
      }
      if (window.gameManager2) {
        window.gameManager2.cleanup();
      }
      
      // Remove window references
      window.gameManager1 = null;
      window.gameManager2 = null;
      window.activeGameManager = null;
    };
  }, []);

  // Add handleGameTypeStart function
  const handleGameTypeStart = (type) => {
    if (!isUsernameSubmitted) {
      alert('Please submit your username first');
      return;
    }

    if (gameMode === 'free' || gameState.hasValidPayment) {
      startGame(type);
    } else {
      alert('Please complete payment to play in paid mode.');
    }
  };

  // Update this useEffect to properly handle the popup state
  useEffect(() => {
    // Check both localStorage (permanent) and sessionStorage (temporary)
    const permanentlyClosed = localStorage.getItem('hasSeenGameTutorial');
    const temporarilyClosed = sessionStorage.getItem('hasSeenGameTutorial');
    
    if (!permanentlyClosed && !temporarilyClosed) {
      setShowGameInfoPopup(true);
    }
  }, []);

  // Update the handlePopupClose function
  const handlePopupClose = () => {
    // Add a small delay before hiding the popup to ensure animations complete
    setTimeout(() => {
      setShowGameInfoPopup(false);
      localStorage.setItem('hasSeenGameTutorial', 'true');
    }, 100);
  };

  // Update the GameInfoPopup component to include transition styles
  const GameInfoPopup = ({ onClose }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
      if (dontShowAgain) {
        localStorage.setItem('hasSeenGameTutorial', 'true');
      } else {
        // If they don't check "don't show again", we'll show it next time
        sessionStorage.setItem('hasSeenGameTutorial', 'true');
      }
      onClose();
    };

    return (
      <div className="game-info-popup-overlay" onClick={handleClose}>
        <div 
          className="game-info-popup"
          onClick={(e) => e.stopPropagation()}
        >
          <h2>Welcome to Tears of Aya!</h2>
          
          <div className="game-types">
            <div className="game-type">
              <h3>Tears of Aya (Classic)</h3>
              <p>A balanced game of skill and strategy:</p>
              <ul>
                <li>Blue Tears = 1 point</li>
                <li>Gold Tears = 15 points (rare)</li>
                <li>Red Tears = -1 life (moderate spawn)</li>
                <li>Green Tears = +1 life (occasional spawn)</li>
              </ul>
            </div>
            
            <div className="game-type">
              <h3>Tears of Blood (Intense)</h3>
              <p>A challenging variant with:</p>
              <ul>
                <li>Faster tear falling speed</li>
                <li>More frequent red tears</li>
                <li>Less frequent healing tears</li>
                <li>Super cool upgrades</li>
              </ul>
            </div>
          </div>

          <div className="game-flow">
            <h3>How to Play</h3>
            <ol>
              <li>Enter your username to begin</li>
              <li>Choose your mode:
                <ul>
                  <li><strong>Free Mode:</strong> Play unlimited times, qualify for paid leaderboard</li>
                  <li><strong>Paid Mode:</strong> Compete for prizes on the main leaderboard</li>
                </ul>
              </li>
              <li>Select your game type (Aya or Blood)</li>
              <li>Use your mouse/touch to move the bucket</li>
              <li>Catch tears to score points</li>
              <li>Survive as long as possible!</li>
            </ol>
          </div>

          <div className="tutorial-preferences">
            <label className="dont-show-again">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              Don't show this tutorial again
            </label>
          </div>

          <button className="start-button" onClick={handleClose}>
            Let's Play!
          </button>
        </div>
      </div>
    );
  };

  // Render method
  return (
    <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      {showGameInfoPopup && (
        <GameInfoPopup onClose={handlePopupClose} />
      )}
      
      {playerName && playerName.length > 0 && (
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
                  value={playerName}
                  onChange={handleUsernameChange}
                  className="username-input"
                  maxLength={25}
                  required
                />
                <button type="submit">Submit</button>
              </form>
            ) : (
              <div>
                <h2>Welcome, {useSuins && suinsData ? suinsData.name : playerName}!</h2>
                <div>
                  <button onClick={() => setIsUsernameSubmitted(false)}>Change Username</button>
                  <label>
                    <input
                      type="checkbox"
                      checked={useSuins}
                      onChange={handleSuinsChange}
                    />
                    use SUINS name
                  </label>
                </div>
              </div>
            )}
          </div>

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

        {!gameState.gameStarted && isUsernameSubmitted && (
          <>
            {gameMode === 'free' && (
              <div className="game-mode-selection">
                <h2>Select Your Game</h2>
                <button onClick={() => handleGameTypeStart('aya')} className="start-button aya">
                  Play Tears of Aya
                </button>
                <button onClick={() => handleGameTypeStart('blood')} className="start-button blood">
                  Play Tears of Blood
                </button>
              </div>
            )}

{gameMode === 'paid' && wallet.connected && (
              <div className="game-mode-selection">
                <h2>Select Your Game</h2>
                {!gameState.hasValidPayment ? (
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
                        <option value="tier2">Short Break - 0.8 SUI (2 Plays)</option>
                        <option value="tier1">Degen Time! - 1.0 SUI (3 Plays)</option>
                      </select>
                    </div>

                    {/* Desktop payment tiers */}
                    {renderPaymentTiers()}

                    {/* Game type buttons */}
                    <div className="game-type-buttons">
                      <button 
                        onClick={() => handleGamePayment('aya')}
                        disabled={paying || !selectedTier}
                        className="start-button aya"
                      >
                        {paying ? 'Processing...' : 'Start Tears of Aya'}
                      </button>
                      <button 
                        onClick={() => handleGamePayment('blood')}
                        disabled={paying || !selectedTier}
                        className="start-button blood"
                      >
                        {paying ? 'Processing...' : 'Start Tears of Blood'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="attempts-info">
                    <p>Attempts remaining: {maxAttempts - paidGameAttempts}</p>
                  </div>
                )}
              </div>
            )}
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
          
          {/* Show qualification notice and choices for free mode with connected wallet */}
          {gameMode === 'free' && wallet.connected && (
            <div className="score-submission-options">
              {qualifiedForPaid ? (
                <div>
                  <h3>Congratulations! Your score qualifies for the paid leaderboard!</h3>
                  <p>Choose where to submit your score:</p>
                  <div className="submission-buttons">
                    <button 
                      onClick={async () => {
                        try {
                          console.log('Starting paid submission for free mode score');
                          setPaying(true);
                          setTransactionInProgress(true);

                          const scoreToSubmit = gameState.score;
                          const currentGameType = window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB';
                          const tierConfig = config.scoreSubmissionTiers[qualifyingTier];
                          const recipients = config.getCurrentRecipients();
                          const totalAmount = tierConfig.amount;
                          
                          const txb = new TransactionBlock();
                          const [primaryCoin, secondaryCoin, tertiaryCoin, rewardsCoin] = txb.splitCoins(
                            txb.gas,
                            [
                              Math.floor(totalAmount * (config.shares.primary / 10000)),
                              Math.floor(totalAmount * (config.shares.secondary / 10000)),
                              Math.floor(totalAmount * (config.shares.tertiary / 10000)),
                              Math.floor(totalAmount * (config.shares.rewards / 10000))
                            ]
                          );

                          txb.transferObjects([primaryCoin], txb.pure(recipients.primary));
                          txb.transferObjects([secondaryCoin], txb.pure(recipients.secondary));
                          txb.transferObjects([tertiaryCoin], txb.pure(recipients.tertiary));
                          txb.transferObjects([rewardsCoin], txb.pure(recipients.rewards));

                          const response = await wallet.signAndExecuteTransaction({
                            transaction: txb,
                            options: { showEffects: true }
                          });

                          if (!response.digest) {
                            throw new Error('Transaction failed - no digest received');
                          }

                          console.log('Transaction successful:', response.digest);

                          // Add payment status update here
                          const paymentDetails = {
                            verified: true,
                            transactionId: response.digest,
                            amount: totalAmount,
                            timestamp: Date.now(),
                            recipient: recipients.primary
                          };

                          // Update state
                          setPaymentStatus(paymentDetails);

                          // Wait for a moment to ensure state is updated
                          await new Promise(resolve => setTimeout(resolve, 100));

                          // Submit score with the same payment details
                          await handleScoreSubmit(scoreToSubmit, 'paid', currentGameType, paymentDetails);
                          
                          setQualifiedForPaid(false);
                          setQualifyingTier(null);
                          alert('Score successfully submitted to paid leaderboard!');
                        } catch (error) {
                          console.error('Error in paid submission process:', error);
                          alert(`Failed to submit score: ${error.message}`);
                        } finally {
                          setTransactionInProgress(false);
                          setPaying(false);
                          }
                        resetGameState();
                        restartGame();
                      }}
                      className="submit-paid-button"
                      disabled={transactionInProgress}
                    >
                      Submit to Paid Leaderboard and Play Again - {config.scoreSubmissionTiers[qualifyingTier]?.label} 
                      ({formatSUI(config.scoreSubmissionTiers[qualifyingTier]?.amount)} SUI)
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          await handleScoreSubmit(gameState.score, 'free', 
                            window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB');
                        } catch (error) {
                          console.error('Error submitting to free leaderboard:', error);
                        }
                        resetGameState();
                        restartGame();
                      }}
                      className="submit-free-button"
                      disabled={transactionInProgress}
                    >
                      Submit to Free Leaderboard and Play Again
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={async () => {
                    try {
                      await handleScoreSubmit(gameState.score, 'free', 
                        window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB');
                    } catch (error) {
                      console.error('Error submitting to free leaderboard:', error);
                    }
                    resetGameState();
                    restartGame();
                  }}
                  className="submit-free-button"
                  disabled={transactionInProgress}
                >
                  Submit to Free Leaderboard and Play Again
                </button>
              )}
            </div>
          )}

          {/* Show play again and return to menu buttons */}
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
                        <option value="mainFreeTOA">TOA All Time Leaderboard</option>
                        <option value="secondaryFreeTOA">TOA Weekly Leaderboard</option>
                        <option value="web2TOA">TOA Normal Players</option>
                        <option value="mainFreeTOB">TOB All Time Leaderboard</option>
                        <option value="secondaryFreeTOB">TOB Weekly Leaderboard</option>
                        <option value="web2TOB">TOB Normal Players</option>
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
                            {leaderboardData[selectedLeaderboards.free]?.map((entry, index) => (
                                <tr key={index} className={`rank-${index + 1}`}>
                                    <td>{index + 1}</td>
                                    <td className="playername-cell">{entry.playerName}</td>
                                    <td className="wallet-cell">
                                        {entry.playerWallet ? getDisplayName(entry.playerWallet) : 'N/A'}
                                    </td>
                                    <td className="score-cell">{entry.score}</td>
                                </tr>
                            ))}
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
                        <option value="mainPaidTOA">TOA All Time Leaderboard</option>
                        <option value="secondaryPaidTOA">TOA Weekly Leaderboard</option>
                        <option value="mainPaidTOB">TOB All Time Leaderboard</option>
                        <option value="secondaryPaidTOB">TOB Weekly Leaderboard</option>
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
                            {leaderboardData[selectedLeaderboards.paid]?.map((entry, index) => (
                                <tr key={index} className={`rank-${index + 1}`}>
                                    <td>{index + 1}</td>
                                    <td className="playername-cell">{entry.playerName}</td>
                                    <td className="wallet-cell">
                                        {entry.playerWallet ? getDisplayName(entry.playerWallet) : 'N/A'}
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