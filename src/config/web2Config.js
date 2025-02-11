const config = {
  apiBaseUrl: 'https://ayagame.onrender.com',
  api: {
    scores: {
      submit: '/api/web2/scores',
      leaderboard: '/api/web2/leaderboard'
    }
  },
  
  debug: {
    enabled: import.meta.env.VITE_APP_DEBUG_MODE === 'true' || true,
    logLevel: import.meta.env.VITE_APP_LOG_LEVEL || 'info',
    verbose: true,
    logStyles: {
      info: 'color: #2054c9',
      error: 'color: #ff0000',
      success: 'color: #00ff00',
      warning: 'color: #ffa500'
    }
  },
  
  web3Info: {
    playUrl: 'https://www.ayaonsui.xyz/tears-of-aya',
    description: 'Try the Web3 version to compete for SUI tokens and exclusive rewards!'
  },

  api_retry: {
    attempts: 3,
    delay: 1000,
    backoff: 2
  },

  fallbacks: {
    avatarUrl: 'https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/default-avatar.png',
    gameBackground: 'https://cdn.prod.website-files.com/6744eaad4ef3982473db4359/674fa00dfaa922f1c9d76f9c_black-and-white-anime-2560-x-1600-background-d8u8u9i7yoalq57c.webp'
  }
};

export default config; 