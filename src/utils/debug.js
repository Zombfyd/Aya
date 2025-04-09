// Debug utility for consistent logging
const debug = {
  isEnabled: () => {
    return import.meta.env.VITE_APP_DEBUG_MODE === 'true' || 
           import.meta.env.MODE === 'development' || 
           import.meta.env.MODE === 'testnet';
  },

  log: (...args) => {
    if (debug.isEnabled()) {
      console.log('[DEBUG]', ...args);
    }
  },

  error: (...args) => {
    if (debug.isEnabled()) {
      console.error('[ERROR]', ...args);
    }
  },

  warn: (...args) => {
    if (debug.isEnabled()) {
      console.warn('[WARN]', ...args);
    }
  },

  info: (...args) => {
    if (debug.isEnabled()) {
      console.info('[INFO]', ...args);
    }
  }
};

export default debug; 