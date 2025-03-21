import { gameManager } from '../game/GameManager.js';
import { SuinsClient } from '@mysten/suins';
import { BloodGameManager } from '../game/assets/BloodGameManager.js';
import AudioManager from '../game/AudioManager.js';

// Initialize both game managers
const gameManager1 = gameManager;
const gameManager2 = new BloodGameManager();

window.gameManager = gameManager1;
window.GameManager2 = gameManager2;
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Transaction as TransactionBlock } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
// import { JsonRpcProvider } from "@mysten/sui.js";
import nftUtils from '../utils/nftUtils';
// import { SuinsClient } from '@mysten/suins';

// Helper function to format a wallet address by truncating it
function formatWalletAddress(addr) {
  if (!addr) return 'Unknown';
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

// Add this utility function at the top of your file, before the component
const isDev = import.meta.env.MODE === 'development' || import.meta.env.MODE === 'testnet';

// Create a custom logger function
const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  error: (...args) => {
    if (isDev) console.error(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  }
};

// Add this utility function near the top of your file with other utility functions
const getIPFSWithFallbacks = (url) => {
  if (!url) return '';
  
  // If it's already a full URL that's not IPFS, return it
  if (url.startsWith('http') && !url.includes('ipfs')) {
    return url;
  }
  
  // Extract CID from various IPFS URL formats
  let cid = url;
  
  if (url.startsWith('ipfs://')) {
    cid = url.replace('ipfs://', '');
  } else if (url.includes('ipfs.io/ipfs/')) {
    cid = url.split('ipfs.io/ipfs/')[1];
  } else if (url.includes('/ipfs/')) {
    cid = url.split('/ipfs/')[1];
  }
  
  // Return direct gateway URL instead of array
  return `https://ipfs.io/ipfs/${cid}`;
};

// Enhance the NFTImage component with better error handling and reporting
const NFTImage = ({ src, alt, className, onLoad }) => {
  const [currentSrc, setCurrentSrc] = useState('');
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Reset state when src changes
    setCurrentSrc(getIPFSWithFallbacks(src));
    setError(false);
  }, [src]);
  
  const handleError = () => {
    setError(true);
    // If image fails to load, use placeholder
    setCurrentSrc('https://placehold.co/200x200?text=Image+Not+Available');
  };
  
  return (
    <img 
      src={currentSrc}
      alt={alt || "NFT Image"}
      className={className}
      onError={handleError}
      onLoad={onLoad}
      loading="lazy"
      style={{ minHeight: '50px', minWidth: '50px' }}
    />
  );
};

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
    hasValidPayment: false,
    selectedTierClicked: false
  });
  const [leaderboardData, setLeaderboardData] = useState({
    mainFreeTOA: [],
    secondaryFreeTOA: [],
    mainPaidTOA: [],
    secondaryPaidTOB: [],
    mainFreeTOB: [],
    secondaryFreeTOB: [],
    mainPaidTOB: [],
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
  const [selectedTier, setSelectedTier] = useState('');
  // Add this to fetch SUI price (you might want to add this to your dependencies)
  const [suiPrice, setSuiPrice] = useState(null);
  const [suinsClient, setSuinsClient] = useState(null);
  const [addressToNameCache, setAddressToNameCache] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    // Check if there's a saved name in localStorage
    const savedName = localStorage.getItem('savedPlayerName');
    return savedName || '';
  });
  const [isUsernameSubmitted, setIsUsernameSubmitted] = useState(() => {
    // If there's a saved name, consider the username as already submitted
    return !!localStorage.getItem('savedPlayerName');
  });
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
  
  // Add this state for token icons
  const [tokenIcons, setTokenIcons] = useState({});
  
  // Add this state at the top with other state declarations
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false);
  
  // Add audio volume state variables
  const [masterVolume, setMasterVolume] = useState(() => {
    const savedVolume = localStorage.getItem('masterVolume');
    return savedVolume ? parseFloat(savedVolume) : 0.7; // Default to 0.7 if not saved
  });
  
  const [musicVolume, setMusicVolume] = useState(() => {
    const savedVolume = localStorage.getItem('musicVolume');
    return savedVolume ? parseFloat(savedVolume) : 0.3; // Default to 0.3 if not saved
  });
  
  const [soundVolume, setSoundVolume] = useState(() => {
    const savedVolume = localStorage.getItem('soundVolume');
    return savedVolume ? parseFloat(savedVolume) : 0.5; // Default to 0.5 if not saved
  });
  
  const [showVolumeControls, setShowVolumeControls] = useState(false);

  const SUINS_TYPE = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::suins_registration::SuinsRegistration";
  const SUINS_REGISTRY = "0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0";
  
  // Add cache state
  const [suinsCache, setSuinsCache] = useState({});
  
  // At the top of your component, add this log
  const client = new SuiClient({
    url: 'https://fullnode.mainnet.sui.io:443'
  });
  
  // Add this state near the top of your file
  const [showGameInfoPopup, setShowGameInfoPopup] = useState(() => {
    // Check both localStorage (permanent) and sessionStorage (temporary) during initialization
    const permanentlyClosed = localStorage.getItem('hasSeenGameTutorial') === 'true';
    const temporarilyClosed = sessionStorage.getItem('hasSeenGameTutorial') === 'true';
    
    console.log('Initial state check:');
    console.log('localStorage hasSeenGameTutorial:', localStorage.getItem('hasSeenGameTutorial'));
    console.log('sessionStorage hasSeenGameTutorial:', sessionStorage.getItem('hasSeenGameTutorial'));
    console.log('permanentlyClosed:', permanentlyClosed);
    console.log('temporarilyClosed:', temporarilyClosed);
    
    return !permanentlyClosed && !temporarilyClosed;
  });
  
  // First, add a new state for the checkbox
  const [neverShowTutorial, setNeverShowTutorial] = useState(false);
  
  // Add after other state declarations
  const [verifiedNFTs, setVerifiedNFTs] = useState([]);
  const [isNFTVerified, setIsNFTVerified] = useState(false);
  const [isCheckingNFTs, setIsCheckingNFTs] = useState(false);
  
  // Add this near the top of the file with other state declarations
  const [showDistribution, setShowDistribution] = useState(false);
  
  // Add state for active collections
  const [activeCollections, setActiveCollections] = useState([]);
  
  // Add this near your other state declarations
  const [selectedPaymentToken, setSelectedPaymentToken] = useState('SUI');
  
  // Add these constants at the top of your file, after other imports
  const PAYMENT_TOKENS = {
    SUI: {
      type: '0x2::sui::SUI',
      symbol: 'SUI',
      decimals: 9,
      icon: "https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256d6f25cb51c68229b_BlueTear.2.png"
    },
    AYA: {
      type: '0x8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b::aya::AYA',
      symbol: 'AYA',
      decimals: 6,  // Change back to 6 decimals
      icon: "https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256d6f25cb51c68229b_BlueTear.2.png"
    }
  };
  
  // Add these state variables for token prices
  const [tokenPrices, setTokenPrices] = useState({
    SUI: null,
    AYA: null
  });
  
  // Update the fetchTokenPrices function to correctly parse the response
  const fetchTokenPrices = async () => {
    try {
      // Add headers with API key
      const headers = {
        'x-api-key': 'insidex_api.VIkoDQuLrf6TTxWfJU3r2ho7',
        'Accept': 'application/json'
      };

      // Fetch SUI price from InsideX
      const suiResponse = await fetch('https://api-ex.insidex.trade/coins/0x2::sui::SUI/price-data', {
        headers
      });
      const suiData = await suiResponse.json();
      
      // Fetch AYA price from InsideX
      const ayaResponse = await fetch('https://api-ex.insidex.trade/coins/0x8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b::aya::AYA/price-data', {
        headers
      });
      const ayaData = await ayaResponse.json();
      
      // Log raw responses for debugging
      logger.log('Raw SUI response:', suiData);
      logger.log('Raw AYA response:', ayaData);

      // Extract current prices from the response
      const suiPrice = suiData?.price || null;
      const ayaPrice = ayaData?.price || null;

      logger.log('Parsed Token Prices:', {
        SUI: suiPrice,
        AYA: ayaPrice
      });

      if (suiPrice === null || ayaPrice === null) {
        throw new Error('Failed to parse price data from API response');
      }

      setTokenPrices({
        SUI: suiPrice,
        AYA: ayaPrice
      });
    } catch (error) {
      logger.error('Error fetching token prices:', error);
      // Keep previous prices on error
      setTokenPrices(prev => ({
        ...prev,
        lastUpdated: Date.now(),
        error: error.message
      }));
    }
  };

  // Update the useEffect for price fetching to include error handling and retry logic
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        await fetchTokenPrices();
      } catch (error) {
        logger.error('Failed to fetch prices:', error);
      }
    };

    // Initial fetch
    fetchPrices();
    
    // Set up polling with retry on failure
    const intervalId = setInterval(fetchPrices, 30000); // Update every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Add this utility function for checking token balances
  const checkTokenBalance = async (tokenType) => {
    try {
      if (!wallet.connected) return BigInt(0);

      const { data: coins } = await client.getCoins({
        owner: wallet.account.address,
        coinType: tokenType
      });

      return coins.reduce((total, coin) => total + BigInt(coin.balance), BigInt(0));
    } catch (error) {
      logger.error(`Error checking ${tokenType} balance:`, error);
      return BigInt(0);
    }
  };
  
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

  // Remove the old PrizeDistributionToggle component and replace with this
  const PrizeDistributionToggle = ({ showDistribution, setShowDistribution }) => (
    <div className="prize-pool-header">
      <label className="prize-distribution-toggle">
        <input
          type="checkbox"
          checked={showDistribution}
          onChange={(e) => setShowDistribution(e.target.checked)}
        />
        Show Prize Distribution
      </label>
    </div>
  );

  const TokenAmount = ({ amount, symbol, coinType }) => {
    const formatLargeNumber = (num, tokenSymbol) => {
      // Different conversion rates for different tokens
      let convertedAmount;
      if (tokenSymbol === 'SUI') {
        convertedAmount = Number(num) / 1e9; // SUI uses 9 decimals
      } else {
        convertedAmount = Number(num) / 1e6; // Default 6 decimals
      }

      const absNum = Math.abs(convertedAmount);
      
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

    const handleExplorerClick = () => {
      if (coinType) {
        // Ensure we use the exact format: packageId::module::TYPE
        const explorerUrl = `https://suivision.xyz/coin/${coinType}`;
        logger.log('Opening SuiVision URL:', explorerUrl);
        // Example URL should look like:
        // https://suivision.xyz/coin/0x8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b::aya::AYA
        window.open(explorerUrl, '_blank');
      }
    };

    const formattedAmount = formatLargeNumber(amount, symbol);

    return (
      <div className="balance-item">
        <div 
          onClick={handleExplorerClick}
          style={{ cursor: coinType ? 'pointer' : 'default' }}
          className="token-amount-wrapper"
          title={coinType ? `View ${symbol} on Sui Explorer` : undefined}
        >
          {formattedAmount} {symbol}
        </div>
        {showDistribution && (
          <div className="token-distribution">
            <h3>Tears of Aya</h3>
            <div className="distribution-row">
              <span>1st Place:</span>
              <span>({formatLargeNumber((BigInt(amount) * BigInt(50)) / BigInt(200), symbol)} {symbol})</span>
            </div>
            <div className="distribution-row">
              <span>2nd Place:</span>
              <span>({formatLargeNumber((BigInt(amount) * BigInt(30)) / BigInt(200), symbol)} {symbol})</span>
            </div>
            <div className="distribution-row">
              <span>3rd Place:</span>
              <span>({formatLargeNumber((BigInt(amount) * BigInt(20)) / BigInt(200), symbol)} {symbol})</span>
            </div>
            <h3>Tears of Blood</h3>
            <div className="distribution-row">
              <span>1st Place:</span>
              <span>({formatLargeNumber((BigInt(amount) * BigInt(50)) / BigInt(200), symbol)} {symbol})</span>
            </div>
            <div className="distribution-row">
              <span>2nd Place:</span>
              <span>({formatLargeNumber((BigInt(amount) * BigInt(30)) / BigInt(200), symbol)} {symbol})</span>
            </div>
            <div className="distribution-row">
              <span>3rd Place:</span>
              <span>({formatLargeNumber((BigInt(amount) * BigInt(20)) / BigInt(200), symbol)} {symbol})</span>
            </div>
          </div>
        )}
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
          logger.error('Failed to initialize game managers');
        }
      } catch (error) {
        logger.error('Error initializing game:', error);
      }
    };

    initializeGame();
  }, []);

  // Add periodic NFT checking
  useEffect(() => {
    if (wallet?.connected) {
      // Initial check
      checkUserNFTs();
      
      // Set up periodic check every 30 seconds
      const nftCheckInterval = setInterval(() => {
        checkUserNFTs();
      }, 30000);

      // Cleanup on unmount or wallet disconnect
      return () => clearInterval(nftCheckInterval);
    }
  }, [wallet?.connected]);

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
                        logger.log('Transaction confirmed:', status);
                        
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
                    }
                }
    } catch (error) {
                logger.error('Payment status check failed:', error);
                setTransactionInProgress(false);
                setPaying(false);
                alert('Failed to verify payment. Please try again.');
            }
        };

        const interval = setInterval(checkPaymentStatus, 2000);
        return () => clearInterval(interval);
    }
}, [transactionInProgress, paymentStatus.transactionId]);

  // Add environment constant at the top of the file
  const environment = import.meta.env.MODE;
  const isTestnet = environment === 'testnet';

  // Enhanced wallet connection monitoring
  useEffect(() => {
    const updateWalletState = async () => {
      if (wallet.connected && wallet.account) {
        const requiredNetwork = isTestnet ? 'Sui Testnet' : 'Sui Mainnet';
        
        if (wallet.chain?.name !== requiredNetwork) {
          logger.log(`Wrong network detected. Current: ${wallet.chain?.name}, Required: ${requiredNetwork}`);
          setWalletInitialized(false);
          alert(`Please switch to ${requiredNetwork} to continue playing.`);
          return;
        }

        logger.log('Correct network detected:', wallet.chain?.name);
        window.currentWalletAddress = wallet.account.address;
        setWalletInitialized(true);
        
        // Update AYA balance when wallet is connected
        try {
          const ayaType = PAYMENT_TOKENS.AYA.type;
          const ayaBalance = await checkTokenBalance(ayaType);
          setAllBalances(prev => ({
            ...prev,
            [ayaType]: ayaBalance
          }));
          
          logger.log('Updated AYA balance:', {
            address: wallet.account.address,
            ayaBalance: ayaBalance.toString()
          });
        } catch (error) {
          logger.error('Error updating AYA balance:', error);
        }
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

  // Add a useEffect to update AYA balance periodically
  useEffect(() => {
    if (!wallet.connected || !wallet.account) return;
    
    const updateAyaBalance = async () => {
      try {
        const ayaType = PAYMENT_TOKENS.AYA.type;
        const ayaBalance = await checkTokenBalance(ayaType);
        setAllBalances(prev => ({
          ...prev,
          [ayaType]: ayaBalance
        }));
        
        logger.log('Periodic AYA balance update:', {
          address: wallet.account.address,
          ayaBalance: ayaBalance.toString()
        });
      } catch (error) {
        logger.error('Error updating AYA balance:', error);
      }
    };
    
    // Update immediately
    updateAyaBalance();
    
    // Then update every 30 seconds
    const intervalId = setInterval(updateAyaBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [wallet.connected, wallet.account, selectedPaymentToken]);

  const checkWalletBalance = async () => {
    try {
      logger.log('Checking wallet balance...');
      
      // Use the balance from useAccountBalance hook
      const balanceInMist = BigInt(balance ?? 0);
      const balanceInSui = Number(balanceInMist) / 1_000_000_000;
      
      logger.log('Wallet balance details:', {
        balanceInSui,
        balanceInMist: balanceInMist.toString(),
        requiredBalance: config.paymentConfig.minBalance / 1_000_000_000
      });
      
      return balanceInSui >= (config.paymentConfig.minBalance / 1_000_000_000);
    } catch (error) {
      logger.error('Balance check error:', error);
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
        logger.log('Starting payment process...');
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

        logger.log('Transaction payload:', tx);

        // Following Suiet example structure exactly
        const response = await wallet.signAndExecuteTransactionBlock({
          transaction: {
            kind: 'pay',
            data: tx.data
          }
        });

        logger.log('Transaction response:', response);

        if (response.digest) {
          logger.log('Transaction successful');
          setPaymentStatus(prev => ({
            ...prev,
            verified: true,
            transactionId: response.digest
          }));
          }

      } catch (error) {
        logger.error('Payment process error:', error);
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
    try {
      logger.log('Submitting score:', { finalScore, submissionGameMode, gameType, paymentDetails });
      const currentGame = gameType || (window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB');
      const environment = import.meta.env.VITE_APP_ENVIRONMENT || 'development';
      const timestamp = Date.now();
      
      logger.log('handleScoreSubmit received:', { 
          finalScore, 
          playerName, 
          gameMode: submissionGameMode,
          game: currentGame,
          walletConnected: wallet.connected,
          paymentStatus,
          environment,
          isTestnet,
          timestamp
      });

      // For testnet environment, just log the score but don't submit to leaderboard
      if (environment === 'development' || (environment === 'testnet' && import.meta.env.VITE_APP_SKIP_SCORE_SUBMIT === 'true')) {
          logger.log('Testnet environment detected - Score not submitted to leaderboard:', {
              score: finalScore,
              playerName,
              game: currentGame,
              mode: submissionGameMode
          });
          return { success: true, message: 'Score logged (testnet mode)' };
      }

      let endpoint;
      let requestBody;

      if (!wallet.connected) {
          // Web2 submission - specific to the game played
          endpoint = `${config.apiBaseUrl}/api/web2/scores`;
          
          // Let the server generate the signature
          requestBody = {
              playerName,
              score: finalScore,
              game: currentGame,
              timestamp,
              signature: 'placeholder' // Add placeholder signature for validation
          };

          const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
              const errorData = await response.json();
              logger.error('Web2 score submission failed:', { 
                  status: response.status, 
                  error: errorData,
                  endpoint,
                  requestBody
              });
              throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          logger.log(`Web2 score submitted successfully for ${currentGame}:`, result);
          await fetchLeaderboards();
          return result;
      }

      // Enhanced verification for paid submissions
      if (submissionGameMode === 'paid') {
          // Check both state and passed payment details
          const verifiedPayment = paymentDetails || paymentStatus;
          if (!verifiedPayment.verified || !verifiedPayment.transactionId) {
              logger.error('Payment verification failed:', { verifiedPayment });
              throw new Error('Payment verification failed - no valid payment found');
          }
      }

      // Submit score with verification data
      endpoint = `${config.apiBaseUrl}/api/scores/${submissionGameMode}`;
      
      const submissions = ['main', 'secondary'].map(async (gameType) => {
          // Let the server generate the signature
          const body = {
              playerWallet: wallet.account?.address,
              score: finalScore,
              type: gameType,
              playerName: playerName || 'Unknown',
              game: currentGame,
              timestamp,
              signature: 'placeholder', // Add placeholder signature for validation
              paymentVerification: submissionGameMode === 'paid' ? {
                  transactionId: paymentDetails?.transactionId,
                  amount: paymentDetails?.amount,
                  timestamp: paymentDetails?.timestamp,
                  recipient: paymentDetails?.recipient
              } : null
          };

          // Log request details in development
          logger.log(`Submitting score to ${endpoint}:`, { type: gameType, body });

          const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
          });

          if (!response.ok) {
              const errorData = await response.json();
              logger.error('Score submission failed:', { 
                  status: response.status, 
                  error: errorData,
                  endpoint,
                  body
              });
              throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          return response.json();
      });

      const [mainResult, secondaryResult] = await Promise.all(submissions);
      logger.log(`Scores submitted successfully for ${currentGame}:`, { 
          main: mainResult, 
          secondary: secondaryResult 
      });
      
      await fetchLeaderboards();
      return { main: mainResult, secondary: secondaryResult };
    } catch (error) {
      console.error('Error submitting score:', error);
      setErrorMessage(`Failed to submit score: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // Update the fetchLeaderboards function
  const fetchLeaderboards = async () => {
    try {
      setIsLeaderboardLoading(true);
      logger.log('Fetching leaderboards...');

      const fetchLeaderboard = async (endpoint) => {
        try {
          const url = `${config.apiBaseUrl}/api${endpoint}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            logger.error(`Failed to fetch leaderboard from ${url}: ${response.status}`);
            return [];
          }
          
          return await response.json();
        } catch (error) {
          logger.error(`Error fetching leaderboard from ${endpoint}:`, error);
          return [];
        }
      };

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
        web2TOA,
        web2TOB
      });
      
    } catch (error) {
      logger.error('Error fetching leaderboards:', error);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  // Add a debug function to test API connectivity
  const debugApiConnectivity = async () => {
    try {
      logger.log('=== Debugging API Connectivity ===');
      
      // Check API endpoints configuration
      const endpointInfo = config.api.debug.getEndpointInfo();
      logger.log('API Endpoints:', endpointInfo);
      
      // Try to connect to the health endpoint
      logger.log('Testing health endpoint...');
      const healthResponse = await fetch(`${config.apiBaseUrl}/health`);
      const healthData = await healthResponse.json();
      logger.log('Health endpoint response:', healthData);
      
      // Try to fetch leaderboard data
      logger.log('Testing leaderboard endpoint...');
      const leaderboardResponse = await fetch(`${config.apiBaseUrl}/api/web2/leaderboard`);
      if (leaderboardResponse.ok) {
        logger.log('Leaderboard endpoint is accessible');
      } else {
        logger.error('Leaderboard endpoint error:', leaderboardResponse.status);
      }
      
      return {
        success: true,
        health: healthData,
        endpoints: endpointInfo,
        connectivity: {
          health: healthResponse.ok,
          leaderboard: leaderboardResponse.ok
        }
      };
    } catch (error) {
      logger.error('API connectivity test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  // Run a connectivity test on component mount
  useEffect(() => {
    if (config.debug.enabled) {
      debugApiConnectivity().then(result => {
        logger.log('API Connectivity Test Result:', result);
      });
    }
  }, []);

  // Update the useEffect for leaderboard fetching
  useEffect(() => {
    logger.log('Initial leaderboard fetch');
    fetchLeaderboards();
    
    // Set up periodic refresh
    const intervalId = setInterval(() => {
      logger.log('Refreshing leaderboards');
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
          url: 'https://fullnode.mainnet.sui.io:443'
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
        logger.error('Error initializing SuiNS client:', error);
      }
    };

    initializeSuinsClient();
  }, []);

  // Update the getSuiNSName function to match the actual data structure
  const getSuiNSName = async (walletAddress) => {
    try {
        if (suinsCache[walletAddress]) {
            logger.log('Using cached SUINS data');
            return suinsCache[walletAddress];
        }

        logger.log('Fetching SUINS for wallet:', walletAddress);
        
        const { data: objects } = await client.getOwnedObjects({
            owner: walletAddress,
            filter: {
                StructType: `${SUINS_REGISTRY}::suins_registration::SuinsRegistration`
            },
        options: {
                showType: true,
                showContent: true,
                showDisplay: true
            }
        });

        if (objects && objects.length > 0) {
            const suinsObject = objects[0];
            if (suinsObject.data?.content?.fields) {
                const fields = suinsObject.data.content.fields;
                const result = {
                    name: fields.domain_name ? `${fields.domain_name}` : null,
                    imageUrl: fields.domain_name ? 
                        `https://api-mainnet.suins.io/nfts/${fields.domain_name}/${fields.expiration_timestamp_ms}` : 
                        null
                };
                
                if (result.name) {
                    setSuinsCache(prev => ({
                        ...prev,
                        [walletAddress]: result
                    }));
                    return result;
                }
            }
        }
        
        // If no SUINS found, cache the wallet address format
        const truncatedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        const result = {
            name: truncatedAddress,
            imageUrl: null
        };
        
        setSuinsCache(prev => ({
            ...prev,
            [walletAddress]: result
        }));
        
        return result;
    } catch (error) {
        logger.error('Error fetching SUINS:', error);
        // Return truncated address on error
        const truncatedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        return {
            name: truncatedAddress,
            imageUrl: null
        };
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
          logger.error('Error updating display name:', error);
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
      logger.error('Cannot restart game - game managers not initialized');
      return;
    }

    // Check if we can start another paid game
    if (gameMode === 'paid') {
      if (paidGameAttempts >= maxAttempts) {
        alert('All paid attempts used. Please make a new payment to continue playing.');
        return;
      }
    }

    // Clean up the active game manager first
    if (window.activeGameManager) {
      window.activeGameManager.cleanup();
      // Re-initialize the game manager to ensure fresh state
      window.activeGameManager.initGame();
    }

    // Reset game state
    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      score: 0,
      isGameOver: false,
    }));

    setTransactionInProgress(false);
    setPaying(false);

    // Start the game with selected type
    logger.log(`Restarting game in ${gameMode} mode, type: ${type}`);
    startGame(type);
    
    // Notify document that game is inactive
    window.postMessage({ type: 'gameStateChange', active: false }, '*');
  };

  // Update startGame to track bucket click state
  const startGame = async (type = 'aya') => {
    if (!window.gameManager1 && !window.gameManager2) {
        logger.error('Game managers not found');
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
        
        // Log remaining attempts
        logger.log('Starting paid game:', {
            currentAttempts: paidGameAttempts,
            maxAttempts: maxAttempts,
            remaining: maxAttempts - paidGameAttempts,
            gameType: type
        });
    }

    try {
        // Choose which game manager to use based on type
        const activeManager = type === 'aya' ? gameManager1 : gameManager2;
        
        // Clean up the previous game manager if it exists
        if (window.activeGameManager) {
            window.activeGameManager.cleanup();
        }
        
        // Set and initialize the new active manager
        window.activeGameManager = activeManager;
        activeManager.cleanup(); // Clean up any previous state
        activeManager.initGame(); // Initialize fresh state

        setGameState(prev => ({
            ...prev,
            gameStarted: true,
            score: 0,
            isGameOver: false,
        }));

        // Notify document that game is active (for touch event handling)
        window.postMessage({ type: 'gameStateChange', active: true }, '*');

        // Handle canvas scrolling
        const canvas = document.getElementById('tearCatchGameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const scrollTop = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
            window.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            });
            
            // Make sure the canvas has the right touch handling properties
            canvas.style.touchAction = 'none';
            
            // Add active class for cursor styling
            canvas.classList.add('active');
            
            // Also add active class to the parent container if it exists
            const gameCanvas = document.querySelector('.game-canvas');
            if (gameCanvas) {
                gameCanvas.classList.add('active');
            }
            
            const centeredCanvas = document.querySelector('.centered-canvas');
            if (centeredCanvas) {
                centeredCanvas.classList.add('active');
            }
        }

        logger.log(`Starting game in ${gameMode} mode, type: ${type}`);
        
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
        logger.error('Error starting game:', error);
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
                logger.log('Game Over triggered with score:', finalScore, 'for game type:', gameType);

                // First, just set the game state and score
                setGameState(prev => ({
                    ...prev,
                    score: finalScore,
                    isGameOver: true,
                    gameStarted: false,
                }));
                
                // Remove active class from canvas elements
                const canvas = document.getElementById('tearCatchGameCanvas');
                if (canvas) {
                    canvas.classList.remove('active');
                }
                
                const gameCanvas = document.querySelector('.game-canvas');
                if (gameCanvas) {
                    gameCanvas.classList.remove('active');
                }
                
                const centeredCanvas = document.querySelector('.centered-canvas');
                if (centeredCanvas) {
                    centeredCanvas.classList.remove('active');
                }

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
                            // Store both the tier and discount information
                            setQualifyingTier(qualificationResult.tier);
                            // Log the discount information
                            logger.log('Qualification with discounts:', qualificationResult);
                        } else {
                            setQualifiedForPaid(false);
                            setQualifyingTier(null);
                            // Submit to free leaderboard automatically if they don't qualify
                            await handleScoreSubmit(finalScore, 'free', gameType);
                        }
                    }
                } catch (error) {
                    logger.error('Error handling game over:', error);
                    alert('Failed to submit score. Please try again.');
                }
                
                // Notify document that game is inactive
                window.postMessage({ type: 'gameStateChange', active: false }, '*');
            };
        }
    };

    // Set up game over handlers for both game types
    setupGameOver(window.gameManager1, 'TOA');
    setupGameOver(window.gameManager2, 'TOB');
}, [gameMode, wallet.connected, handleScoreSubmit, paymentStatus, paidGameAttempts, maxAttempts]);

  // Add this function to check if user can afford a tier
  const canAffordTier = (tierAmount) => {
    return true;
  };

  // Update the SUI price fetching function
  useEffect(() => {
    const fetchSuiPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
        const data = await response.json();
        setSuiPrice(data.sui.usd);
    } catch (error) {
        logger.error('Error fetching SUI price:', error);
        setSuiPrice(null);
      }
    };
    
    fetchSuiPrice();
    const interval = setInterval(fetchSuiPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Add this detection function near the top of your file
  const isReactNativeWebView = () => {
    return (
      typeof navigator !== 'undefined' && 
      (navigator.userAgent.includes('ReactNativeWebView') || 
       window.ReactNativeWebView !== undefined)
    );
  };

  // Update calculateTokenAmount to handle tiers and AYA conversion correctly
  const calculateTokenAmount = (baseSuiAmount, tokenSymbol) => {
    // Get the tier amount from config if available, otherwise use the provided base amount
    const tierAmount = selectedTier ? config.paymentTiers[selectedTier].amount : baseSuiAmount;
    
    // Apply NFT discount to the tier amount if applicable
    const discountedTierAmount = isNFTVerified ? BigInt(tierAmount) / BigInt(2) : BigInt(tierAmount);
    
    let finalAmount;
    if (tokenSymbol === 'SUI') {
      // For SUI, use the discounted tier amount directly (already in MIST)
      finalAmount = discountedTierAmount;
    } else {
      // For AYA, convert the SUI amount to AYA using price ratio
      // First convert SUI from MIST to base units
      const suiBaseAmount = Number(discountedTierAmount) / Math.pow(10, PAYMENT_TOKENS.SUI.decimals);
      
      // Calculate equivalent AYA amount based on price ratio
      // If SUI is $1 and AYA is $0.5, then 1 SUI = 2 AYA
      const ayaAmount = tokenPrices.SUI && tokenPrices.AYA 
        ? (suiBaseAmount * tokenPrices.SUI / tokenPrices.AYA) 
        : 0;
      
      // Convert to AYA base units (multiply by AYA decimals)
      finalAmount = BigInt(Math.floor(ayaAmount * Math.pow(10, PAYMENT_TOKENS.AYA.decimals)));
    }

    return finalAmount;
  };

  // Update the handleGamePayment function to use the tier amount
  const handleGamePayment = async (paymentTier) => {
    if (!wallet.connected) {
        alert('Please connect wallet to continue');
        return;
    }

    try {
        logger.log('Processing payment for tier:', paymentTier || selectedTier);
        setTransactionInProgress(true);
        setPaying(true);

        const tierConfig = config.paymentTiers[paymentTier || selectedTier];
        if (!tierConfig) {
            throw new Error('Invalid tier selected');
        }
        logger.log('Selected tier configuration:', {
            tierId: paymentTier || selectedTier,
            amount: tierConfig.amount,
            plays: tierConfig.plays,
            label: tierConfig.label
        });

        const recipients = config.getCurrentRecipients();
        const shares = config.shares;

        if (selectedPaymentToken === 'SUI') {
            // SUI payment logic - using the original approach
            const baseAmount = BigInt(tierConfig.amount);
            const totalAmount = isNFTVerified ? baseAmount / BigInt(2) : baseAmount;
            logger.log('Payment details:', {
                token: 'SUI',
                baseAmount: baseAmount.toString(),
                isNFTVerified,
                finalAmount: totalAmount.toString(),
                plays: tierConfig.plays
            });

            const shareAmounts = {
                primary: (totalAmount * BigInt(shares.primary)) / BigInt(10000),
                secondary: (totalAmount * BigInt(shares.secondary)) / BigInt(10000),
                tertiary: (totalAmount * BigInt(shares.tertiary)) / BigInt(10000),
                rewards: (totalAmount * BigInt(shares.rewards)) / BigInt(10000)
            };
            logger.log('Share distribution:', shareAmounts);

            const txb = new TransactionBlock();
            const [primary, secondary, tertiary, rewards] = txb.splitCoins(txb.gas, [
                shareAmounts.primary.toString(),
                shareAmounts.secondary.toString(),
                shareAmounts.tertiary.toString(),
                shareAmounts.rewards.toString()
            ]);

            txb.transferObjects([primary], txb.pure.address(recipients.primary));
            txb.transferObjects([secondary], txb.pure.address(recipients.secondary));
            txb.transferObjects([tertiary], txb.pure.address(recipients.tertiary));
            txb.transferObjects([rewards], txb.pure.address(recipients.rewards));

            logger.log('Executing transaction...');
            const response = await wallet.signAndExecuteTransactionBlock({
                transactionBlock: txb,
                options: { showEffects: true, showEvents: true }
            });

            if (!response?.digest) {
                throw new Error('Transaction failed - no digest received');
            }
            logger.log('Transaction successful:', {
                digest: response.digest,
                tier: paymentTier || selectedTier,
                maxAttempts: tierConfig.plays
            });

            // Update states after successful payment
            setPaymentStatus({
                verified: true,
                transactionId: response.digest,
                amount: Number(totalAmount),
                timestamp: Date.now(),
                recipient: recipients.primary
            });
            
            setMaxAttempts(tierConfig.plays);
            setPaidGameAttempts(0);
            
            // Set hasValidPayment to true and ensure game is not started
            setGameState(prev => ({
                ...prev,
                hasValidPayment: true,
                gameStarted: false,
                isGameOver: false,
                score: 0,
                selectedTierClicked: true  // Add this to track that a tier was selected
            }));

            logger.log('Game state updated after payment:', {
                hasValidPayment: true,
                gameStarted: false,
                isGameOver: false,
                score: 0,
                selectedTierClicked: true
            });
        } else {
            // AYA payment logic - keep as is
            // Calculate base amount based on selected token
            const suiBaseAmount = Number(tierConfig.amount) / Math.pow(10, PAYMENT_TOKENS.SUI.decimals);
            const ayaAmount = tokenPrices.SUI && tokenPrices.AYA 
                ? (suiBaseAmount * tokenPrices.SUI / tokenPrices.AYA) 
                : 0;
            // Apply 25% discount for AYA payments
            const discountedAyaAmount = ayaAmount * 0.75;
            const baseAmount = BigInt(Math.floor(discountedAyaAmount * Math.pow(10, PAYMENT_TOKENS.AYA.decimals)));
            const totalAmount = isNFTVerified ? baseAmount / BigInt(2) : baseAmount;
            
            logger.log('Payment details:', {
                token: 'AYA',
                baseAmount: baseAmount.toString(),
                isNFTVerified,
                finalAmount: totalAmount.toString(),
                plays: tierConfig.plays,
                discount: '25% AYA discount applied'
            });

            const shareAmounts = {
                primary: (totalAmount * BigInt(shares.primary)) / BigInt(10000),
                secondary: (totalAmount * BigInt(shares.secondary)) / BigInt(10000),
                tertiary: (totalAmount * BigInt(shares.tertiary)) / BigInt(10000),
                rewards: (totalAmount * BigInt(shares.rewards)) / BigInt(10000)
            };
            logger.log('Share distribution:', shareAmounts);

            const packageId = '0x8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b';
            
            // Get AYA coins
            const { data: coins } = await client.getCoins({
                owner: wallet.account.address,
                coinType: `${packageId}::aya::AYA`
            });

            logger.log('Available AYA coins:', coins);

            if (coins.length === 0) throw new Error('No AYA coins found');

            // Find a coin with sufficient balance
            const selectedCoin = coins.find(coin => BigInt(coin.balance) >= totalAmount);
            if (!selectedCoin) {
                throw new Error(`Insufficient AYA balance. Need ${Number(totalAmount) / Math.pow(10, PAYMENT_TOKENS.AYA.decimals)} AYA`);
            }

            const txb = new TransactionBlock();
            // Split the selected coin
            const [primary, secondary, tertiary, rewards] = txb.splitCoins(
                txb.object(selectedCoin.coinObjectId),
                [
                    shareAmounts.primary.toString(),
                    shareAmounts.secondary.toString(),
                    shareAmounts.tertiary.toString(),
                    shareAmounts.rewards.toString()
                ]
            );

            // Transfer AYA shares
            txb.transferObjects([primary], txb.pure.address(recipients.primary));
            txb.transferObjects([secondary], txb.pure.address(recipients.secondary));
            txb.transferObjects([tertiary], txb.pure.address(recipients.tertiary));
            txb.transferObjects([rewards], txb.pure.address(recipients.rewards));

            logger.log('Executing transaction...');
            const response = await wallet.signAndExecuteTransactionBlock({
                transactionBlock: txb,
                options: { showEffects: true, showEvents: true }
            });

            if (!response?.digest) {
                throw new Error('Transaction failed - no digest received');
            }
            logger.log('Transaction successful:', {
                digest: response.digest,
                tier: paymentTier || selectedTier,
                maxAttempts: tierConfig.plays
            });

            // Update states after successful payment
            setPaymentStatus({
                verified: true,
                transactionId: response.digest,
                amount: Number(totalAmount),
                timestamp: Date.now(),
                recipient: recipients.primary
            });
            
            setMaxAttempts(tierConfig.plays);
            setPaidGameAttempts(0);
            
            // Set hasValidPayment to true and ensure game is not started
            setGameState(prev => ({
                ...prev,
                hasValidPayment: true,
                gameStarted: false,
                isGameOver: false,
                score: 0,
                selectedTierClicked: true  // Add this to track that a tier was selected
            }));

            logger.log('Game state updated after payment:', {
                hasValidPayment: true,
                gameStarted: false,
                isGameOver: false,
                score: 0,
                selectedTierClicked: true
            });
        }
    } catch (error) {
        logger.error('Payment error:', error);
        alert(`Payment failed: ${error.message}`);
        
        // Reset states on failure
        setGameState(prev => ({
            ...prev,
            hasValidPayment: false,
            gameStarted: false,
            selectedTierClicked: false
        }));
    } finally {
        setTransactionInProgress(false);
        setPaying(false);
    }
  };

  // Update the renderMobilePaymentTiers function to remove duplicate selector
  const renderMobilePaymentTiers = () => (
    <div className="mobile-payment-tiers">
      <select
        className="tier-select"
        value={selectedTier}
        onChange={async (e) => {
          const selectedTierId = e.target.value;
          console.log("Selected tier:", selectedTierId);
          
          if (selectedTierId) {
            console.log("Payment tier selected:", selectedTierId);
            console.log("Payment token:", selectedPaymentToken);
            
            // Log the tier details
            const tier = config.paymentTiers[selectedTierId];
            console.log("Tier details:", tier);
          
            setSelectedTier(selectedTierId);
            await new Promise(resolve => setTimeout(resolve, 100));
            await handleGamePayment(selectedTierId);
          }
        }}
      >
        <option value="">-- Select Payment Tier --</option>
        {Object.entries(config.paymentTiers).map(([tierId, tier]) => {
          // Calculate display amount based on selected token
          let displayAmount, displaySymbol;
          
          if (selectedPaymentToken === 'SUI') {
            const originalAmount = tier.amount / 1_000_000_000;
            displayAmount = isNFTVerified ? originalAmount / 2 : originalAmount;
            displaySymbol = 'SUI';
          } else {
            // For AYA, convert the SUI amount to AYA using price ratio
            const suiBaseAmount = Number(tier.amount) / Math.pow(10, PAYMENT_TOKENS.SUI.decimals);
            const ayaAmount = tokenPrices.SUI && tokenPrices.AYA 
              ? (suiBaseAmount * tokenPrices.SUI / tokenPrices.AYA) 
              : 0;
            // Apply 25% discount for AYA payments
            const discountedAyaAmount = ayaAmount * 0.75;
            displayAmount = isNFTVerified ? discountedAyaAmount / 2 : discountedAyaAmount;
            displaySymbol = 'AYA';
          }
          
          // Calculate USD value
          const usdValue = displayAmount * (tokenPrices[selectedPaymentToken] || 0);
          const usdDisplay = tokenPrices[selectedPaymentToken] 
            ? `≈$${usdValue.toFixed(2)}` 
            : '(Loading...)';
          
          return (
            <option 
              key={tierId} 
              value={tierId}
              disabled={paying || (!tokenPrices.SUI || !tokenPrices.AYA)}
            >
              {`${tier.label} - ${displayAmount.toFixed(displaySymbol === 'SUI' ? 2 : 0)} ${displaySymbol} (${usdDisplay}) - ${tier.plays} ${tier.plays === 1 ? 'Play' : 'Plays'}`}
            </option>
          );
        })}
      </select>
      
          
    </div>
  );

useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('header');
      if (header) {  // Add check for header existence
        if (window.scrollY > window.innerHeight * 0.3) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Update checkScoreQualification with corrected comparison logic
  const checkScoreQualification = async (score, game) => {
    try {
        logger.log(`Checking qualification for game ${game} with score ${score}`);
        logger.log('Discount status:', { isNFTVerified, selectedPaymentToken });
        
        const endpoint = `${config.apiBaseUrl}/api/scores/leaderboard/secondary/paid?game=${game}`;
        logger.log('Checking against weekly paid leaderboard:', endpoint);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const leaderboardData = await response.json();
        logger.log(`Current ${game} weekly paid leaderboard:`, {
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
        
        // Include discount information with the qualification tier
        if (qualificationTier) {
            return {
                tier: qualificationTier,
                discounts: {
                    nftDiscount: isNFTVerified,
                    ayaDiscount: selectedPaymentToken === 'AYA'
                }
            };
        }
        
        return null;
    } catch (error) {
        logger.error('Error checking score qualification:', error);
        return null;
    }
};




// Update the fetchPrimaryWalletBalance function to filter zero balances
const fetchPrimaryWalletBalance = async () => {
    logger.log('=== PRIZE POOL BALANCE CHECK ===');
    try {
        const recipients = config.getCurrentRecipients();
        if (!recipients?.primary) {
            logger.error('Primary recipient address is undefined');
            return;
        }

        // Fetch all coins for the prize pool wallet
        const { data: allCoins } = await client.getAllCoins({
            owner: recipients.primary
        });

        // Group coins by type and sum balances
        const balanceMap = new Map();
        for (const coin of allCoins) {
            const coinType = coin.coinType;
            const balance = BigInt(coin.balance);
            
            // Only process non-zero balances
            if (balance > BigInt(0)) {
                // Get existing balance or initialize to 0
                const existingBalance = balanceMap.get(coinType) || {
                    balance: BigInt(0),
                    coinType: coinType
                };
                
                // Add current balance to existing
                existingBalance.balance += balance;
                balanceMap.set(coinType, existingBalance);
            }
        }

        // Convert to the format expected by the state
        const balancesByCoin = {};
        const tokenIconsMap = {};

        for (const [coinType, data] of balanceMap.entries()) {
            // Only process coins with non-zero balances
            if (data.balance > BigInt(0)) {
                // Extract symbol from coin type (e.g., "0x2::sui::SUI" -> "SUI")
                const symbol = coinType.split('::').pop();
                
                balancesByCoin[symbol] = {
                    balance: data.balance,
                    coinType: coinType
                };

                // Try to fetch coin metadata for icon
                try {
                    const metadata = await client.getCoinMetadata({ coinType });
                    if (metadata?.iconUrl) {
                        tokenIconsMap[symbol] = nftUtils.formatIPFSUrl(metadata.iconUrl);
                    }
                } catch (error) {
                    logger.warn(`Failed to fetch metadata for ${symbol}:`, error);
                }

                // Set default SUI icon
                if (coinType === '0x2::sui::SUI') {
                    tokenIconsMap['SUI'] = "https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256d6f25cb51c68229b_BlueTear.2.png";
                }
            }
        }

        // Fetch NFTs
        const { data: nftObjects } = await client.getOwnedObjects({
            owner: recipients.primary,
            options: {
                showType: true,
                showContent: true,
                showDisplay: true
            }
        });

        // Process NFTs
        const nfts = nftObjects
            .filter(obj => {
                const type = obj.data?.content?.type || '';
                return !type.includes('0x2::coin'); // Filter out coin objects
            })
            .map(obj => {
                const displayData = obj.data?.display?.data || {};
                const contentFields = obj.data?.content?.fields || {};
                
                let imageUrl = displayData.image_url || 
                             contentFields.url || 
                             contentFields.image_url;
                
                if (imageUrl) {
                    imageUrl = nftUtils.formatIPFSUrl(imageUrl);
                }

                return {
                    id: obj.data.objectId,
                    type: obj.data.content.type,
                    name: displayData.name || contentFields.name || 'Unnamed NFT',
                    description: displayData.description || contentFields.description || '',
                    url: imageUrl
                };
            });

        logger.log('Prize Pool Assets:', {
            coins: balancesByCoin,
            nfts: nfts.length
        });

        // Update states
        setAllBalances(balancesByCoin);
        setTokenIcons(tokenIconsMap);
        setNFTs(nfts);

    } catch (error) {
        logger.error('Error fetching prize pool assets:', error);
        // Reset states on error
        setAllBalances({});
        setTokenIcons({});
        setNFTs([]);
    }
};

// Update the useEffect for fetching prize pool assets
useEffect(() => {
    fetchPrimaryWalletBalance();
    
    // Set up periodic refresh every 30 seconds
    const intervalId = setInterval(fetchPrimaryWalletBalance, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
}, []);

const resetGameState = () => {
    if (window.gameManager1) {
        window.gameManager1.cleanup();
        window.gameManager1.initGame(); // Reinitialize the game manager
    }
    
    // Only reset game-specific state, preserve payment and attempts state
    setGameState(prev => ({
        ...prev,
        gameStarted: false,
        score: 0,
        isGameOver: false,
        // Preserve hasValidPayment from previous state
    }));
    
    setQualifyingTier(null);
    setQualifiedForPaid(false);
    
    // Do not reset attempts or payment state here
    // The attempts should only be incremented in handlePaidGameAttempt
    // which is called after game over
};

const handlePaidGameAttempt = () => {
    const newAttempts = paidGameAttempts + 1;
    logger.log('Updating paid attempts:', { current: paidGameAttempts, new: newAttempts, max: maxAttempts });
    
    setPaidGameAttempts(newAttempts);
    
    // Only show alert and reset state after their last game is finished
    if (newAttempts >= maxAttempts) {
        alert('You have used all your paid attempts. Please make a new payment to continue playing.');
        
        // Reset all game and payment related states
        setGameState(prev => ({
            ...prev,
            hasValidPayment: false,
            selectedTierClicked: false,  // Reset the tier selection state
            gameStarted: false,          // Ensure game is stopped
            isGameOver: false            // Reset game over state
        }));
        
        // Reset attempts counters
        setPaidGameAttempts(0);
        setMaxAttempts(0);
        
        // Reset payment status to prevent further verification attempts
        setPaymentStatus({
            verified: false,
            transactionId: null,
            error: null,
            amount: null,
            timestamp: null,
            recipient: null
        });
        
        // Reset transaction states
        setTransactionInProgress(false);
        setPaying(false);
        
        // Reset game state
        resetGameState();
    }
};

// Add this function to clear the saved username
const clearSavedUsername = () => {
  localStorage.removeItem('savedPlayerName');
  setPlayerName('');
  setIsUsernameSubmitted(false);
};

const handleUsernameChange = (e) => {
    setPlayerName(e.target.value);
};

const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim() && playerName.length <= 25) {
        // Save the player name to localStorage
        localStorage.setItem('savedPlayerName', playerName.trim());
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
    // Save the SUINS name to localStorage
    localStorage.setItem('savedPlayerName', suinsData.name);
    setIsUsernameSubmitted(true);
  } else {
    // If unchecking and we have a saved name, use that
    const savedName = localStorage.getItem('savedPlayerName');
    if (savedName && savedName !== suinsData?.name) {
      setPlayerName(savedName);
    } else {
      // Otherwise just keep the current name
      setPlayerName(playerName);
    }
  }
};

  // Move the cleanup useEffect inside the component
  useEffect(() => {
    return () => {
      // Cleanup event listeners for both game managers
      if (window.gameManager1) {
        window.gameManager1.cleanup();
        window.gameManager1.initGame();
      }
      if (window.gameManager2) {
        window.gameManager2.cleanup();
        window.gameManager2.initGame();
      }
      
      // Reset game state
      setGameState(prev => ({
        ...prev,
        gameStarted: false,
        score: 0,
        isGameOver: false
      }));
      
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
      // Initialize game state before starting
      setGameState(prev => ({
        ...prev,
        gameStarted: false,
        isGameOver: false,
        score: 0
      }));

      // Start the game with selected type
      startGame(type);
    } else {
      alert('Please complete payment to play in paid mode.');
      return;
    }
  };

  // Update this useEffect to properly handle the popup state
  // This useEffect is now redundant since we check localStorage/sessionStorage in the initial state
  // useEffect(() => {
  //   // Check both localStorage (permanent) and sessionStorage (temporary)
  //   const permanentlyClosed = localStorage.getItem('hasSeenGameTutorial');
  //   const temporarilyClosed = sessionStorage.getItem('hasSeenGameTutorial');
    
  //   if (!permanentlyClosed && !temporarilyClosed) {
  //     setShowGameInfoPopup(true);
  //   }
  // }, []);

  // Update the handlePopupClose function
  const handlePopupClose = () => {
    console.log('handlePopupClose called');
    
    // Simply hide the popup without modifying localStorage/sessionStorage
    setShowGameInfoPopup(false);
    
    console.log('After handlePopupClose:');
    console.log('localStorage hasSeenGameTutorial:', localStorage.getItem('hasSeenGameTutorial'));
    console.log('sessionStorage hasSeenGameTutorial:', sessionStorage.getItem('hasSeenGameTutorial'));
  };

  // Update the GameInfoPopup component to include transition styles
  const GameInfoPopup = ({ onClose }) => {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // Add console.log for debugging
    useEffect(() => {
      console.log('GameInfoPopup mounted');
      console.log('localStorage hasSeenGameTutorial:', localStorage.getItem('hasSeenGameTutorial'));
      console.log('sessionStorage hasSeenGameTutorial:', sessionStorage.getItem('hasSeenGameTutorial'));
    }, []);

    const handleClose = () => {
      console.log('handleClose called, dontShowAgain:', dontShowAgain);
      
      if (dontShowAgain) {
        // If "don't show again" is checked, store in localStorage (permanent)
        console.log('Setting localStorage to true');
        localStorage.setItem('hasSeenGameTutorial', 'true');
      } else {
        // If "don't show again" is NOT checked, only store in sessionStorage (temporary)
        console.log('Setting sessionStorage to true');
        sessionStorage.setItem('hasSeenGameTutorial', 'true');
        // Make sure localStorage doesn't have the value
        localStorage.removeItem('hasSeenGameTutorial');
        console.log('Set sessionStorage, removed localStorage');
      }
      
      console.log('After handleClose:');
      console.log('localStorage hasSeenGameTutorial:', localStorage.getItem('hasSeenGameTutorial'));
      console.log('sessionStorage hasSeenGameTutorial:', sessionStorage.getItem('hasSeenGameTutorial'));
      
      onClose();
    };

    return (
      <div className="game-info-popup-overlay" onClick={(e) => {
        console.log('Overlay clicked');
        // Prevent clicks on the overlay from closing the popup
        e.stopPropagation();
        handleClose();
      }}>
        <div 
          className="game-info-popup"
          onClick={(e) => {
            console.log('Popup clicked');
            // Prevent clicks on the popup from triggering the overlay's onClick
            e.stopPropagation();
          }}
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

          <button className="start-button" onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling
            console.log('Let\'s Play button clicked, dontShowAgain:', dontShowAgain);
            handleClose();
          }}>
            Let's Play!
          </button>
        </div>
      </div>
    );
  };

  // Automatic NFT check on page load removed to improve performance
  // useEffect(() => {
  //   if (wallet.connected && wallet.account?.address) {
  //     checkUserNFTs();
  //   }
  // }, [wallet.connected, wallet.account?.address]);

  // Clear collections cache on page load/reload
  useEffect(() => {
    // Clear collections cache on page load to ensure we get fresh data
    nftUtils.clearAllNFTCaches();
    logger.log('Collections cache cleared on page load');
  }, []);

  // Clear wallet-specific cache when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.account?.address) {
      // Clear this specific wallet's cache to ensure we get fresh data on connection
      nftUtils.clearNFTCacheForWallet(wallet.account.address);
      logger.log(`Wallet cache cleared for ${wallet.account.address.slice(0, 8)}...`);
    }
  }, [wallet.connected, wallet.account?.address]);

  // Add NFT verification function
  const checkUserNFTs = async (forceRefresh = false) => {
    setIsCheckingNFTs(true);
    
    try {
      // First fetch the active collections
      const collections = await nftUtils.fetchActiveCollections();
      setActiveCollections(collections || []);
      
      // Check both directly owned NFTs and kiosk items, using cache unless forceRefresh is true
      const result = await nftUtils.checkUserNFTsAndKiosk(client, wallet, forceRefresh);
      
      // Update state with results
      setVerifiedNFTs(result.nfts || []);
      setIsNFTVerified(result.verified || false);
    } catch (error) {
      logger.error('Error checking NFTs:', error);
      setVerifiedNFTs([]);
      setIsNFTVerified(false);
      setActiveCollections([]);
    } finally {
      setIsCheckingNFTs(false);
    }
  };

  // Add function to manually refresh NFTs
  const refreshNFTs = () => {
    if (wallet.connected && wallet.account?.address) {
      // Clear both collection cache and wallet-specific cache to get completely fresh data
      nftUtils.clearAllNFTCaches();
      logger.log('Cache cleared for manual refresh');
      
      // Force refresh by passing true to bypass any remaining cache
      checkUserNFTs(true);
    }
  };

  // Replace queryChillCatsNFTs function with call to nftUtils
  const queryChillCatsNFTs = async (address) => {
    return await nftUtils.queryChillCatsNFTs(client, address);
  };

  // Replace getNFTDetails function with call to nftUtils
  const getNFTDetails = async (objectId) => {
    return await nftUtils.getNFTDetails(client, objectId);
  };

  // Replace everything from here until the useEffect for token icons
  useEffect(() => {
    // Initialize token icons with the imported SUI logo
    setTokenIcons({
      SUI: 'https://cdn.prod.website-files.com/6425f546844727ce5fb9e5ab/65690e5e73e9e2a416e3502f_sui-mark.svg'
    });
  }, []);

  // Add this detection function for mobile devices
  const isMobileDevice = () => {
    return (
      typeof navigator !== 'undefined' && 
      (navigator.userAgent.match(/Android/i) ||
       navigator.userAgent.match(/webOS/i) ||
       navigator.userAgent.match(/iPhone/i) ||
       navigator.userAgent.match(/iPad/i) ||
       navigator.userAgent.match(/iPod/i) ||
       navigator.userAgent.match(/BlackBerry/i) ||
       navigator.userAgent.match(/Windows Phone/i))
    );
  };

  // Then use it to show mobile-specific UI or instructions
  useEffect(() => {
    if (isMobileDevice() && wallet.connected) {
      // Show mobile-specific instructions or UI
      logger.log('Mobile device detected with connected wallet');
    }
  }, [wallet.connected]);

  // Add this component for mobile wallet guidance
  const MobileWalletGuide = () => {
    if (!isMobileDevice() || !wallet.connected) return null;
    
    return (
      <div className="mobile-wallet-guide">
        <p>Mobile Wallet Tips:</p>
        <ol>
          <li>Ensure your wallet app is up to date</li>
          <li>If payment fails, try switching to your wallet app and back</li>
          <li>For best experience, use the in-app browser of your wallet app</li>
        </ol>
      </div>
    );
  };

  // Update testAyaPayment to use proper decimal conversion
  const testAyaPayment = async () => {
    try {
      logger.log('Testing AYA payment...');
      setPaying(true);
      setTransactionInProgress(true);

      const packageId = '0x8e9187b49143e6071d8bdee63e34224a8e79fdaa6207d2d2ed54007c45936e0b';
      // Total amount in base units (1000 * 10^6)
      const testAmount = 1000 * Math.pow(10, PAYMENT_TOKENS.AYA.decimals);

      // Calculate split amounts (40%, 30%, 20%, 10%)
      const primaryAmount = Math.floor(testAmount * 0.4);    // 400 AYA
      const secondaryAmount = Math.floor(testAmount * 0.3);  // 300 AYA
      const tertiaryAmount = Math.floor(testAmount * 0.2);   // 200 AYA
      const rewardsAmount = testAmount - primaryAmount - secondaryAmount - tertiaryAmount; // 100 AYA (remainder)

      // Get AYA coins
      const { data: coins } = await client.getCoins({
        owner: wallet.account.address,
        coinType: `${packageId}::aya::AYA`
      });

      logger.log('Available AYA coins:', coins);

      if (coins.length === 0) throw new Error('No AYA coins found');

      // Find a coin with sufficient balance
      const selectedCoin = coins.find(coin => BigInt(coin.balance) >= BigInt(testAmount));
      if (!selectedCoin) {
        throw new Error(`Insufficient AYA balance. Need ${testAmount / Math.pow(10, PAYMENT_TOKENS.AYA.decimals)} AYA`);
      }

      // Create transaction block
      const tx = new TransactionBlock();

      // Split the coin into shares
      const [primary, secondary, tertiary, rewards] = tx.splitCoins(
        tx.object(selectedCoin.coinObjectId),
        [
          tx.pure.u64(primaryAmount),
          tx.pure.u64(secondaryAmount),
          tx.pure.u64(tertiaryAmount),
          tx.pure.u64(rewardsAmount)
        ]
      );

      // Transfer each share
      tx.transferObjects([primary], tx.pure.address(config.getCurrentRecipients().primary));
      tx.transferObjects([secondary], tx.pure.address(config.getCurrentRecipients().secondary));
      tx.transferObjects([tertiary], tx.pure.address(config.getCurrentRecipients().tertiary));
      tx.transferObjects([rewards], tx.pure.address(config.getCurrentRecipients().rewards));

      logger.log('Executing AYA split transfer:', {
        from: wallet.account.address,
        totalAmount: testAmount / Math.pow(10, PAYMENT_TOKENS.AYA.decimals),
        splits: {
          primary: primaryAmount / Math.pow(10, PAYMENT_TOKENS.AYA.decimals),
          secondary: secondaryAmount / Math.pow(10, PAYMENT_TOKENS.AYA.decimals),
          tertiary: tertiaryAmount / Math.pow(10, PAYMENT_TOKENS.AYA.decimals),
          rewards: rewardsAmount / Math.pow(10, PAYMENT_TOKENS.AYA.decimals)
        },
        recipients: config.getCurrentRecipients(),
        coinId: selectedCoin.coinObjectId
      });

      const response = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
          gasBudget: 10000000
        }
      });

      logger.log('Test transaction response:', response);

      if (response.digest) {
        alert('Test AYA split transfer successful!');
      }

    } catch (error) {
      logger.error('Test payment error:', error);
      alert(`Test payment failed: ${error.message}`);
    } finally {
      setTransactionInProgress(false);
      setPaying(false);
    }
  };

  // Update the renderPaymentTiers function to handle loading and error states
  const renderPaymentTiers = () => {
    return (
      <div className="payment-section">
        <div className="token-selector">
          <select 
            value={selectedPaymentToken} 
            onChange={(e) => {
              const newToken = e.target.value;
              setSelectedPaymentToken(newToken);
              
              // If switching to AYA, update AYA balance immediately
              if (newToken === 'AYA' && wallet.connected && wallet.account) {
                const updateAyaBalance = async () => {
                  try {
                    const ayaType = PAYMENT_TOKENS.AYA.type;
                    const ayaBalance = await checkTokenBalance(ayaType);
                    setAllBalances(prev => ({
                      ...prev,
                      [ayaType]: ayaBalance
                    }));
                    
                    logger.log('AYA balance updated after token switch:', {
                      address: wallet.account.address,
                      ayaBalance: ayaBalance.toString()
                    });
                  } catch (error) {
                    logger.error('Error updating AYA balance after token switch:', error);
                  }
                };
                
                updateAyaBalance();
              }
            }}
            className="token-select"
          >
            <option value="SUI">Pay with SUI</option>
            <option value="AYA">Pay with AYA</option>
          </select>
          {(!tokenPrices.SUI || !tokenPrices.AYA) && (
            <div className="price-loading">Loading prices...</div>
          )}
        </div>

        <div className="payment-tiers">
          {Object.entries(config.paymentTiers).map(([tierId, tier]) => {
            // Get base amount in SUI
            const baseSuiAmount = tier.amount / (10 ** PAYMENT_TOKENS.SUI.decimals);
            
            // Calculate display amount based on selected token
            let displayAmount;
            if (selectedPaymentToken === 'SUI') {
              displayAmount = baseSuiAmount;
            } else {
              // Calculate equivalent AYA amount based on price ratio
              displayAmount = tokenPrices.SUI && tokenPrices.AYA 
                ? (baseSuiAmount * tokenPrices.SUI / tokenPrices.AYA) 
                : 0;
                
              // Apply 25% discount for AYA payments
              displayAmount = displayAmount * 0.75;
            }

            // Apply NFT discount if applicable
            if (isNFTVerified) {
              displayAmount = displayAmount / 2;
            }

            // Calculate USD value for display
            const usdValue = displayAmount * (tokenPrices[selectedPaymentToken] || 0);

            return (
              <button
                key={tierId}
                className={`tier-button ${selectedTier === tierId ? 'selected' : ''}`}
                onClick={async () => {
                  setSelectedTier(tierId);
                  // Add a small delay to allow the UI to update
                  await new Promise(resolve => setTimeout(resolve, 100));
                  // Automatically start payment process
                  await handleGamePayment(tierId);
                }}
                disabled={paying || !tokenPrices[selectedPaymentToken]}
              >
                <div className="tier-label">{tier.label}</div>
                <div className="tier-price">
                  {displayAmount.toFixed(selectedPaymentToken === 'SUI' ? 2 : 0)} {selectedPaymentToken}
                  <div className="usd-value">
                    {tokenPrices[selectedPaymentToken] 
                      ? `(≈$${usdValue.toFixed(2)})` 
                      : '(Loading price...)'}
                  </div>
                </div>
                <div className="tier-plays">{tier.plays} {tier.plays === 1 ? 'Play' : 'Plays'}</div>
              </button>
            );
          })}
        </div>
        
        {/* Active Discounts Section */}
        <div className="active-discounts">
          <h4>Active Discounts:</h4>
          <div className="discount-list">
            {selectedPaymentToken === 'AYA' && (
              <div className="discount-item">
                <span className="discount-badge">25% off</span>
                <span className="discount-description">AYA payment discount</span>
              </div>
            )}
            {isNFTVerified && (
              <div className="discount-item">
                <span className="discount-badge">50% off</span>
                <span className="discount-description">NFT holder discount</span>
              </div>
            )}
            {!isNFTVerified && selectedPaymentToken !== 'AYA' && (
              <div className="discount-item no-discount">
                <span className="discount-description">No active discounts</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add a function to show the tutorial
  const showTutorial = () => {
    console.log('showTutorial called');
    console.log('Before clearing:');
    console.log('localStorage hasSeenGameTutorial:', localStorage.getItem('hasSeenGameTutorial'));
    console.log('sessionStorage hasSeenGameTutorial:', sessionStorage.getItem('hasSeenGameTutorial'));
    
    // Clear both storage items
    localStorage.removeItem('hasSeenGameTutorial');
    sessionStorage.removeItem('hasSeenGameTutorial');
    
    // Force the popup to show
    setShowGameInfoPopup(true);
    
    console.log('After clearing:');
    console.log('localStorage hasSeenGameTutorial:', localStorage.getItem('hasSeenGameTutorial'));
    console.log('sessionStorage hasSeenGameTutorial:', sessionStorage.getItem('hasSeenGameTutorial'));
  };

  // Add a useEffect to log when the playerName changes
  useEffect(() => {
    console.log('playerName changed:', playerName);
    console.log('localStorage savedPlayerName:', localStorage.getItem('savedPlayerName'));
    console.log('isUsernameSubmitted:', isUsernameSubmitted);
  }, [playerName, isUsernameSubmitted]);

  // Add a useEffect to apply volume settings
  useEffect(() => {
    // Apply master volume
    AudioManager.setMasterVolume(masterVolume);
    localStorage.setItem('masterVolume', masterVolume.toString());
    
    // Apply music volume
    if (AudioManager.sounds.backgroundMusic) {
      AudioManager.sounds.backgroundMusic.volume(musicVolume);
    }
    localStorage.setItem('musicVolume', musicVolume.toString());
    
    // Apply sound effects volume
    const soundEffects = ['blueTear', 'redTear', 'goldTear', 'splash'];
    soundEffects.forEach(sound => {
      if (AudioManager.sounds[sound]) {
        AudioManager.sounds[sound].volume(soundVolume);
      }
    });
    localStorage.setItem('soundVolume', soundVolume.toString());
    
  }, [masterVolume, musicVolume, soundVolume]);
  
  // Add a useEffect to handle clicking outside the volume controls panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if the panel is open
      if (!showVolumeControls) return;
      
      // Check if the click was outside the volume controls
      const volumeControls = document.querySelector('.volume-controls-container');
      if (volumeControls && !volumeControls.contains(event.target)) {
        setShowVolumeControls(false);
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeControls]);

  // Add a VolumeControls component
  

  // Render method
  return (
    <div className={`game-container ${gameState.gameStarted ? 'active' : ''}`}>
      
      

      {showGameInfoPopup && (
        <GameInfoPopup onClose={handlePopupClose} />
      )}
      
      {/* Add testnet mode indicator */}
      {isTestnet && (
        <div className="testnet-indicator">
          🧪 Testnet Mode - Scores will not be saved to leaderboard
        </div>
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
              />
            )}
            <span>{playerName}</span>
          </span>
        </div>
      )}

      {(!gameState.gameStarted && !gameState.isGameOver) && (
        <header>
          <div className="title-section">
            <div className="tears-container">
              <img src="https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256d6f25cb51c68229b_BlueTear.2.png" loading="lazy" alt="Blue Tear" className="tear-image" />
              <img src="https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b225c9f972035e5189e4b_GreenTear.2.png" loading="lazy" alt="Green Tear" className="tear-image" />
              <img src="https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256456275e1857d4646_RedTear.2.png" loading="lazy" alt="Red Tear" className="tear-image" />
              <img src="https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/676b2256f3bb96192df8af03_GoldTear.2.png" loading="lazy" alt="Gold Tear" className="tear-image" />
            </div>
            <h1 className="game-title">
              <a href="/tears-of-aya">Tears of Aya</a>
            </h1>
            
          </div>
          
          {/* User Profile Section */}
          <div className="user-info-section">
            <div 
              className="assets-header"
              onClick={() => {
                const content = document.querySelector('.user-info-section .assets-content');
                content.classList.toggle('expanded');
                document.querySelector('.user-info-section .dropdown-arrow').classList.toggle('expanded');
              }}
            >
              <h3>{useSuins && suinsData ? suinsData.name : playerName}'s' Profile</h3>
              <span className="dropdown-arrow">▼</span>
            </div>
            
            <div className="assets-content">
              {/* Add Volume Controls back to the assets-content section */}
              <div className="volume-controls-container">
                <div className="volume-controls-header">
                  <h4>Audio Settings</h4>
                  <button 
                    className="volume-toggle-button"
                    onClick={() => setShowVolumeControls(!showVolumeControls)}
                  >
                    {masterVolume === 0 ? '🔇' : masterVolume < 0.3 ? '🔈' : masterVolume < 0.7 ? '🔉' : '🔊'}
                  </button>
                </div>
                
                {showVolumeControls && (
                  <div className="volume-controls-panel">
                    <div className="volume-control">
                      <label>Master Volume</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={masterVolume}
                        onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                      />
                      <span>{Math.round(masterVolume * 100)}%</span>
                    </div>
                    
                    <div className="volume-control">
                      <label>Music Volume</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      />
                      <span>{Math.round(musicVolume * 100)}%</span>
                    </div>
                    
                    <div className="volume-control">
                      <label>Sound Effects</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={soundVolume}
                        onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      />
                      <span>{Math.round(soundVolume * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="username-container">
                {!isUsernameSubmitted ? (
                  <form className="username-form" onSubmit={handleUsernameSubmit}>
                    <input
                      type="text"
                      placeholder="Enter your username"
                      value={playerName}
                      onChange={handleUsernameChange}
                      className="username-input"
                      maxLength={25}
                      required
                    />
                    <button type="submit">Set Username</button>
                  </form>
                ) : (
                  <div className="username-controls">
                    <h4>Welcome, {useSuins && suinsData ? suinsData.name : playerName}!</h4>
                    <button onClick={clearSavedUsername}>Change Username</button>
                    <label>
                      <input
                        type="checkbox"
                        checked={useSuins}
                        onChange={handleSuinsChange}
                      />
                      Use SUINS name
                    </label>
                    
                  </div>
                )}
                
                <ConnectButton
                label="Connect SUI Wallet"
                onConnectError={(error) => {
                  if (error.code === ErrorCode.WALLET__CONNECT_ERROR__USER_REJECTED) {
                    logger.warn("User rejected connection to " + error.details?.wallet);
                  } else {
                    logger.warn("Unknown connect error: ", error);
                  }
                }}
                
              />
              </div>
              
              {wallet.connected && (
                
                <div className="nft-verification-section">
                  <h3>NFT Verification Status</h3>
                  {wallet.connected && (
                    <button 
                      className="refresh-nfts-btn blue-button" 
                      onClick={refreshNFTs} 
                      disabled={isCheckingNFTs}
                      title="Refresh NFTs"
                      style={{
                        backgroundColor: '#2054c9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: isCheckingNFTs ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {isCheckingNFTs ? '⟳ Refreshing...' : '⟳ Refresh'}
                    </button>
                  )}
                  {isCheckingNFTs ? (
                    <div className="nft-status">Checking NFTs...</div>
                  ) : isNFTVerified ? (
                    <div className="nft-status success">
                      <p>✅ NFT Verified - 50% Discount Applied!</p>
                      <div className="verified-nfts">
                        {verifiedNFTs.map((nft, index) => (
                          <div 
                            key={`${nft.objectId}-${index}`}
                            className={`nft-item ${nft.in_kiosk ? 'kiosk-item' : 'direct-item'} ${nft.isUnverifiedNFT ? 'unverified-nft' : 'verified-nft'}`}
                            onClick={() => {
                              // Use the correct collection ID from collectionType property
                              const collectionId = nft.collectionType ? nft.collectionType.split('::')[0] : 
                                                 nft.type ? nft.type.split('::')[0] : null;
                              if (collectionId) {
                                window.open(`https://tradeport.xyz/sui/collection/${collectionId}`, '_blank');
                              }
                            }}
                          >
                            <img 
                              className="nft-image" 
                              src={nft.image_url || '/placeholder.png'} 
                              alt={nft.name || 'NFT'} 
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder.png';
                              }}
                            />
                            <div className="nft-info">
                              <span className="nft-name">{nft.name || 'Unnamed NFT'}</span><br></br>
                              {nft.in_kiosk && <span className="nft-badge kiosk-badge">In Kiosk</span>}
                              {nft.isUnverifiedNFT && <span className="nft-badge unverified-badge">Unverified</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                    </div>
                    
                  ) : (
                    <div className="nft-status">
                      <p>No eligible NFTs found in your wallet</p>
                      <div className="active-collections">
                        <h4>Available Discount Collections:</h4>
                        {activeCollections.map((collection, index) => (
                          <div key={index} className="collection-item">
                            <div className="collection-info">
                              <h4>
                                {collection.name}
                                {collection.discountPercentage && (
                                  <span className="discount-badge">
                                    {collection.discountPercentage}% off
                                  </span>
                                )}
                              </h4>
                            </div>
                            <div className="collection-details">
                              <a
                                href={`https://tradeport.xyz/sui/collection/${collection.collectionType.split('::')[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="view-collection-btn"
                              >
                                View on Tradeport
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="nft-hint">
                        Get an NFT from any of these collections to receive discounts on paid games!
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              
            </div>
            
          </div>

          {/* Prize Pool Assets Section */}
          <div className="wallet-info">
            <div 
              className="assets-header" 
             
            >
              <h3>Prize Pool Assets</h3>
              <PrizeDistributionToggle 
                  showDistribution={showDistribution}
                  setShowDistribution={setShowDistribution}
                />
              <span onClick={() => setIsAssetsExpanded(!isAssetsExpanded)}className={`dropdown-arrow ${isAssetsExpanded ? 'expanded' : ''}`}>
                ▼
              </span>
            </div>
            
            <div className={`assets-content ${isAssetsExpanded ? 'expanded' : ''}`}>
              <div className="balance-list">
                
                {Object.entries(allBalances).map(([symbol, data]) => (
                  <div key={symbol} className="token-wrapper">
                    {tokenIcons[symbol] && (
                      <img 
                        src={tokenIcons[symbol]} 
                        alt={`${symbol} icon`}
                        className="token-icon"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          logger.error('Failed to load token icon:', tokenIcons[symbol]);
                        }}
                      />
                    )}
                    <TokenAmount amount={data.balance} symbol={symbol} coinType={data.coinType} />
                  </div>
                ))}
              </div>

              {/* Prize Pool NFTs Section */}
              {nfts.length > 0 && (
                <div className="prize-pool-nfts">
                  <h4>Prize Pool NFTs</h4>
                  <div className="prize-pool-nft-grid">
                    {nfts.map((nft, index) => (
                      <div 
                        key={index} 
                        className="prize-pool-nft-item"
                        onClick={() => {
                          const objectId = nft.type.split('::')[0];
                          window.open(`https://tradeport.xyz/sui/collection/${objectId}`, '_blank');
                        }}
                        style={{ cursor: 'pointer' }}
                        title={nft.description || nft.name}
                      >
                        {nft.url && (
                          <NFTImage 
                            src={nft.url} 
                            alt={nft.name} 
                            className="prize-pool-nft-image"
                          />
                        )}
                        <div className="prize-pool-nft-name">{nft.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Add a button to show the tutorial */}
      <button 
        className="view-tutorial-button" 
        onClick={showTutorial}
        style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          zIndex: 1000 
        }}
      >
        View Tutorial
      </button>

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
              <p style={{
                color: '#2054c9',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                Attempts Remaining: <span style={{ fontSize: '1.4rem' }}>{maxAttempts - paidGameAttempts}</span>
              </p>
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
                  {(!gameState.hasValidPayment || paidGameAttempts >= maxAttempts) ? (
                    <>
                      <h2>Select Payment Tier</h2>
                      <MobileWalletGuide />
                      <div className="payment-section">
                        {/* Desktop payment tiers */}
                        {renderPaymentTiers()}
                        {/* Mobile dropdown */}
                        <div className="payment-tiers-mobile">
                          {renderMobilePaymentTiers()}
                        </div>
                        
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>Select Your Game</h2>
                      <div className="game-type-buttons">
                        <button 
                          onClick={() => handleGameTypeStart('aya')} 
                          className="start-button aya"
                        >
                          Play Tears of Aya
                        </button>
                        <button 
                          onClick={() => handleGameTypeStart('blood')} 
                          className="start-button blood"
                        >
                          Play Tears of Blood
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
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
        </header>
      )}

      <canvas id="tearCatchGameCanvas" className={`game-canvas ${gameState.gameStarted ? 'centered-canvas' : ''}`} />

      {gameState.isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-popup">
            <h2>Game Over!</h2>
            <p>Final Score: {gameState.score}</p>
            
            {/* Add attempts counter for paid mode */}
            {gameMode === 'paid' && (
              <div className="attempts-counter" style={{
                marginTop: '10px',
                padding: '10px',
                background: 'rgba(32, 84, 201, 0.1)',
                borderRadius: '8px',
                color: '#2054c9',
                fontWeight: 'bold'
              }}>
                <p>Attempts Used: {paidGameAttempts} / {maxAttempts}</p>
                <p>Remaining: {maxAttempts - paidGameAttempts}</p>
              </div>
            )}
            
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
                            logger.log('Starting paid submission for free mode score');
                            setPaying(true);
                            setTransactionInProgress(true);

                            const scoreToSubmit = gameState.score;
                            const currentGameType = window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB';
                            const tierConfig = config.scoreSubmissionTiers[qualifyingTier];
                            const recipients = config.getCurrentRecipients();
                            const baseAmount = BigInt(tierConfig.amount);
                            
                            // Apply NFT discount if verified
                            const totalAmount = isNFTVerified ? baseAmount / BigInt(2) : baseAmount;

                            // Log discount information
                            logger.log('Applying discounts for paid submission:', {
                                baseAmount: Number(baseAmount),
                                isNFTVerified,
                                totalAmount: Number(totalAmount),
                                discountApplied: isNFTVerified ? '50% NFT discount' : 'No discount'
                            });

                            // Calculate shares using BigInt
                            const primaryShare = BigInt(config.shares.primary);
                            const secondaryShare = BigInt(config.shares.secondary);
                            const tertiaryShare = BigInt(config.shares.tertiary);
                            const rewardsShare = BigInt(config.shares.rewards);
                            const totalShares = BigInt(10000);

                            const primaryAmount = totalAmount * primaryShare / totalShares;
                            const secondaryAmount = totalAmount * secondaryShare / totalShares;
                            const tertiaryAmount = totalAmount * tertiaryShare / totalShares;
                            const rewardsAmount = totalAmount * rewardsShare / totalShares;

                            const txb = new TransactionBlock();

                            // Split the coins for all recipients
                            const [primaryCoin, secondaryCoin, tertiaryCoin, rewardsCoin] = txb.splitCoins(
                              txb.gas,
                              [primaryAmount.toString(), secondaryAmount.toString(), tertiaryAmount.toString(), rewardsAmount.toString()]
                            );

                            // Transfer to all recipients - Using direct transfer like in handleGamePayment
                            txb.transferObjects([primaryCoin], recipients.primary);
                            txb.transferObjects([secondaryCoin], recipients.secondary);
                            txb.transferObjects([tertiaryCoin], recipients.tertiary);
                            txb.transferObjects([rewardsCoin], recipients.rewards);

                            const response = await wallet.signAndExecuteTransactionBlock({
                              transactionBlock: txb,
                              options: { 
                                showEffects: true,
                                showEvents: true,
                                showInput: true,
                                showObjectChanges: true
                              }
                            });

                            if (!response.digest) {
                              throw new Error('Transaction failed - no digest received');
                            }

                            logger.log('Transaction successful:', response);

                            // Create payment details for score submission
                            const paymentDetails = {
            verified: true,
                              transactionId: response.digest,
                              amount: Number(totalAmount),
                              timestamp: Date.now(),
                              recipient: recipients.primary
                            };

                            // Submit score with payment verification
                            await handleScoreSubmit(scoreToSubmit, 'paid', currentGameType, paymentDetails);
                            
                            alert('Score successfully submitted to paid leaderboard!');
                          } catch (error) {
                            logger.error('Error in paid submission process:', error);
                            alert(`Failed to submit score: ${error.message}`);
                          } finally {
                            setTransactionInProgress(false);
                            setPaying(false);
                            resetGameState();
                            restartGame();
                          }
                        }}
                        className="submit-paid-button"
                        disabled={transactionInProgress}
                      >
                        Submit to Paid Leaderboard - {config.scoreSubmissionTiers[qualifyingTier]?.label} 
                        ({isNFTVerified ? 
                          `${formatSUI(config.scoreSubmissionTiers[qualifyingTier]?.amount / 2)} SUI (50% NFT discount)` : 
                          `${formatSUI(config.scoreSubmissionTiers[qualifyingTier]?.amount)} SUI`})
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await handleScoreSubmit(gameState.score, 'free', 
                              window.activeGameManager === window.gameManager1 ? 'TOA' : 'TOB');
                            resetGameState();
                            restartGame();
                          } catch (error) {
                            logger.error('Error submitting to free leaderboard:', error);
                            alert(`Failed to submit score: ${error.message}`);
                          }
                        }}
                        className="submit-free-button"
                        disabled={transactionInProgress}
                      >
                        Submit Score to Free leaderboard and Play Again
                      </button>
                    </div>
                  </div>
                ) : null}
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