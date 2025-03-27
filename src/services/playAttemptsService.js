import config from '../config/config';

/**
 * Get API base URL from config
 */
const API_BASE_URL = config.apiBaseUrl;

/**
 * Gets a signature for a play attempt
 * @param {string} playerWallet - Player's wallet address
 * @param {string} game - Game type ('TOA' or 'TOB')
 * @param {string} gameType - Game type ('main' or 'secondary')
 * @param {string} gameMode - Game mode ('free' or 'paid')
 * @returns {Promise<Object>} - Signature data
 */
export const getPlayAttemptSignature = async (playerWallet, game = 'TOA', gameType = 'main', gameMode = 'free') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/play-attempt-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerWallet,
        game,
        gameType,
        gameMode
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get play attempt signature: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting play attempt signature:', error);
    throw error;
  }
};

/**
 * Starts a play attempt
 * @param {string} playerWallet - Player's wallet address
 * @param {Object} gameData - Game data
 * @param {string} gameData.game - Game type ('TOA' or 'TOB')
 * @param {string} gameData.gameType - Game type ('main' or 'secondary')
 * @param {string} gameData.gameMode - Game mode ('free' or 'paid')
 * @param {Object} gameData.sessionData - Custom session data
 * @returns {Promise<Object>} - Play attempt data
 */
export const startPlayAttempt = async (playerWallet, gameData) => {
  try {
    // First, get a signature
    const signatureData = await getPlayAttemptSignature(
      playerWallet,
      gameData.game,
      gameData.gameType,
      gameData.gameMode
    );
    
    const { signature, timestamp } = signatureData;
    
    // Start the play attempt with the signature
    const response = await fetch(`${API_BASE_URL}/api/plays/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerWallet,
        game: gameData.game,
        gameType: gameData.gameType,
        gameMode: gameData.gameMode,
        sessionData: gameData.sessionData || {},
        signature,
        timestamp
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to start play attempt: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error starting play attempt:', error);
    throw error;
  }
};

/**
 * Completes a play attempt
 * @param {string} attemptId - Play attempt ID
 * @param {boolean} scoreSubmitted - Whether a score was submitted
 * @param {Object} additionalData - Additional session data
 * @returns {Promise<Object>} - Updated play attempt data
 */
export const completePlayAttempt = async (attemptId, scoreSubmitted, additionalData = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/plays/attempts/${attemptId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scoreSubmitted,
        sessionData: additionalData
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to complete play attempt: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error completing play attempt:', error);
    throw error;
  }
};

/**
 * Gets player statistics
 * @param {string} playerWallet - Player's wallet address
 * @returns {Promise<Object>} - Player statistics
 */
export const getPlayerStats = async (playerWallet) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/plays/player/${playerWallet}/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to get player stats: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error getting player stats:', error);
    throw error;
  }
};

/**
 * Gets player attempts
 * @param {string} playerWallet - Player's wallet address
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Player attempts
 */
export const getPlayerAttempts = async (playerWallet, options = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.offset !== undefined) queryParams.append('offset', options.offset);
    if (options.game) queryParams.append('game', options.game);
    if (options.gameType) queryParams.append('gameType', options.gameType);
    if (options.gameMode) queryParams.append('gameMode', options.gameMode);
    if (options.completed !== undefined) queryParams.append('completed', options.completed);
    
    const url = `${API_BASE_URL}/api/plays/player/${playerWallet}/attempts?${queryParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to get player attempts: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error getting player attempts:', error);
    throw error;
  }
};

/**
 * Purchases play attempts
 * @param {string} playerWallet - Player's wallet address
 * @param {number} quantity - Number of attempts to purchase
 * @param {Object} paymentData - Payment data
 * @param {string} paymentData.tokenType - Token type (SUI or AYA)
 * @param {string} paymentData.transactionId - Transaction ID
 * @param {string} paymentData.amount - Amount of tokens paid
 * @param {string} paymentData.purchaseTime - Purchase time (ISO string)
 * @returns {Promise<Object>} - Purchase result
 */
export const purchasePlayAttempts = async (playerWallet, quantity, paymentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/plays/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerWallet,
        quantity,
        payment: paymentData
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to purchase play attempts: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error purchasing play attempts:', error);
    throw error;
  }
};

/**
 * Grants free play attempts to a wallet (for admin/testing purposes)
 * @param {string} playerWallet - Player's wallet address
 * @param {number} quantity - Number of attempts to grant
 * @returns {Promise<Object>} - Grant result
 */
export const grantPlayAttempts = async (playerWallet, quantity) => {
  try {
    // When in dev mode, use the local server instead of production API
    const isLocalDev = import.meta.env.DEV;
    // Use local API for development
    const apiUrl = isLocalDev ? 'http://localhost:6969' : API_BASE_URL;
    
    console.log(`Using API at: ${apiUrl} (Development mode: ${isLocalDev ? 'Yes' : 'No'})`);
    
    const response = await fetch(`${apiUrl}/api/plays/grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerWallet,
        quantity,
        grantReason: 'Admin or test grant'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to grant play attempts: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error granting play attempts:', error);
    throw error;
  }
};

// Add grant utility for testing
export const localGrantPlayAttempts = async (wallet, quantity) => {
  // This function now uses the real API instead of localStorage
  console.log(`Granting ${quantity} play attempts to wallet: ${wallet}`);
  
  try {
    // Check if we're in development mode
    const isLocalDev = import.meta.env.DEV;
    
    // Use the real grantPlayAttempts API instead of localStorage
    const result = await grantPlayAttempts(wallet, parseInt(quantity, 10));
    
    console.log(`Successfully granted ${quantity} play attempts. New total: ${result.totalAttempts}`);
    
    // Also update any in-memory state if possible
    try {
      // This is a hack to update the React state if the app is running
      if (window.updatePlayAttempts && typeof window.updatePlayAttempts === 'function') {
        window.updatePlayAttempts(result.totalAttempts);
      }
    } catch (e) {
      console.warn('Could not update in-memory state:', e);
    }
    
    return {
      success: true,
      wallet,
      granted: parseInt(quantity, 10),
      totalAttempts: result.totalAttempts
    };
  } catch (error) {
    console.error('Error granting play attempts:', error);
    
    // If we're in development mode, return mock successful data
    if (import.meta.env.DEV) {
      console.log('[DEV MODE] Returning mock successful grant data');
      const mockResult = {
        success: true,
        wallet,
        granted: parseInt(quantity, 10),
        totalAttempts: parseInt(quantity, 10),
        message: `[MOCK] Successfully granted ${quantity} play attempts to ${wallet}`
      };
      
      // Still update React state if possible
      try {
        if (window.updatePlayAttempts && typeof window.updatePlayAttempts === 'function') {
          window.updatePlayAttempts(parseInt(quantity, 10));
        }
      } catch (e) {
        console.warn('Could not update in-memory state:', e);
      }
      
      // Show an alert for visual feedback
      if (typeof window !== 'undefined') {
        window.alert(`[DEV MODE] Mock granted ${quantity} play attempts to ${wallet}`);
      }
      
      return mockResult;
    }
    
    throw error;
  }
}; 