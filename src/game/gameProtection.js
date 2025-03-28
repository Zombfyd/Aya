// Game protection mechanisms
// Environment check - only enable in production
const isProduction = import.meta.env.VITE_APP_ENVIRONMENT === 'production';
const debugEnabled = localStorage.getItem('aya_admin_debug') === 'true';
// New flag for testing protections in dev mode
const testProtectionsEnabled = localStorage.getItem('aya_test_protections') === 'true';

// Admin bypass check - updated to consider test protections
const isAdminMode = () => {
  // In production, admin mode is only enabled with the debug flag
  if (isProduction) {
    return debugEnabled;
  }
  
  // In development, admin mode is enabled by default
  // AND test protections are not enabled
  return !testProtectionsEnabled;
};

// Should enable protections - more selective
const shouldEnableProtections = () => {
  // In production, always enable protections unless admin mode is active
  if (isProduction) {
    return !isAdminMode();
  }
  
  // In development, only enable protections if explicitly requested
  return testProtectionsEnabled === true;
};

// Score protection
let gameScore = 0;
let lastScoreUpdate = Date.now();
let scoreUpdateCount = 0;
const SCORE_UPDATE_THRESHOLD = 100; // Maximum score updates per second
const MIN_TIME_BETWEEN_UPDATES = 10; // Minimum milliseconds between updates

// Use a closure to protect the score
const scoreManager = (() => {
  let protectedScore = 0;
  let lastValidScore = 0;
  let scoreChecksum = 0;
  
  // Create a checksum based on score and a secret
  const calculateChecksum = (score) => {
    const gameSecret = 'your-game-secret'; // Change this to a unique value
    return Array.from(String(score + gameSecret)).reduce(
      (hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0
    );
  };

  return {
    getScore: () => {
      // Skip validation in admin mode
      if (isAdminMode()) {
        return protectedScore;
      }
      
      // Verify score integrity
      if (calculateChecksum(protectedScore) !== scoreChecksum) {
        console.error('Score manipulation detected!');
        protectedScore = lastValidScore; // Restore last valid score
      }
      return protectedScore;
    },
    
    updateScore: (newScore) => {
      const now = Date.now();
      
      // Skip validation in admin mode
      if (isAdminMode()) {
        protectedScore = newScore;
        scoreChecksum = calculateChecksum(protectedScore);
        return true;
      }
      
      // Rate limiting check
      if (now - lastScoreUpdate < MIN_TIME_BETWEEN_UPDATES) {
        console.warn('Score updates too frequent');
        return false;
      }
      
      // Validate score change
      const scoreDiff = Math.abs(newScore - protectedScore);
      if (scoreDiff > 100) { // Adjust threshold based on your game
        console.warn('Suspicious score change detected');
        return false;
      }
      
      // Update score tracking
      scoreUpdateCount++;
      if (now - lastScoreUpdate >= 100) {
        if (scoreUpdateCount > SCORE_UPDATE_THRESHOLD) {
          console.warn('Too many score updates');
          return false;
        }
        scoreUpdateCount = 0;
        lastScoreUpdate = now;
      }
      
      // Update protected score
      lastValidScore = protectedScore;
      protectedScore = newScore;
      scoreChecksum = calculateChecksum(protectedScore);
      return true;
    },
    
    resetScore: () => {
      protectedScore = 0;
      lastValidScore = 0;
      scoreChecksum = calculateChecksum(0);
      scoreUpdateCount = 0;
      lastScoreUpdate = Date.now();
    }
  };
})();

// Setup basic protections against tampering
const setupAntiDebug = () => {
  // Skip anti-debug in admin mode
  if (isAdminMode()) {
    console.info('Admin mode active: Game protections disabled');
    return;
  }
  
  // Prevent right-click to open context menu
  window.addEventListener('contextmenu', (e) => {
    if (shouldEnableProtections()) {
      e.preventDefault();
      return false;
    }
  });
  
  // Prevent keyboard shortcuts that might open DevTools
  window.addEventListener('keydown', (e) => {
    if (!shouldEnableProtections()) return;
    
    // Windows/Linux shortcuts
    // Detect F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    const isWindowsDevToolsShortcut = 
      e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'));
    
    // Mac shortcuts
    // Detect Cmd+Option+I, Cmd+Option+J, Cmd+Option+C, Alt+Cmd+I, Option+Cmd+I
    const isMacDevToolsShortcut = 
      (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
      (e.altKey && e.shiftKey && (e.key === 'I' || e.key === 'i'));
    
    // Detect Mac and Windows developer menu access
    const isDevMenuAccess = 
      (e.altKey && e.key === 'E') || // Alt+E on Windows
      (e.metaKey && e.altKey && e.key === 'U'); // Cmd+Option+U (View Source on Mac)
    
    if (isWindowsDevToolsShortcut || isMacDevToolsShortcut || isDevMenuAccess) {
      e.preventDefault();
      return false;
    }
    
    // Detect copy-paste shortcuts (to prevent manipulation)
    // Works for both Windows (Ctrl) and Mac (Cmd)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'C' || e.key === 'c' || e.key === 'V' || e.key === 'v' || e.key === 'X' || e.key === 'x')) {
      e.preventDefault();
      return false;
    }
  });
  
  // Prevent selecting text (can help prevent copy-paste)
  const preventSelection = (e) => {
    if (shouldEnableProtections()) {
      e.preventDefault();
      return false;
    }
  };
  
  document.addEventListener('selectstart', preventSelection);
  document.addEventListener('mousedown', (e) => {
    // Allow clicking buttons and links
    if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A')) {
      return true;
    }
    
    // Prevent double-click text selection
    if (shouldEnableProtections() && e.detail > 1) {
      e.preventDefault();
      return false;
    }
  });
  
  // Prevent drag-and-drop
  document.addEventListener('dragstart', preventSelection);
  
  // Disable console.log messages in production
  if (shouldEnableProtections() && !isAdminMode()) {
    const noop = () => {};
    
    // Store original console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    
    // Override with empty functions in production
    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
    
    // Restore on page unload (just to be clean)
    window.addEventListener('beforeunload', () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    });
  }
};

// Admin mode toggle function (to be called from the console with a secret key)
const toggleAdminMode = (key) => {
  // Simple admin key verification - in a real app, this should be more secure
  const validKey = 'aya_admin_access';
  
  if (key === validKey) {
    const currentState = localStorage.getItem('aya_admin_debug') === 'true';
    localStorage.setItem('aya_admin_debug', (!currentState).toString());
    console.log(`Admin debug mode ${!currentState ? 'enabled' : 'disabled'}`);
    return `Admin mode ${!currentState ? 'enabled' : 'disabled'}. Reload the page for changes to take effect.`;
  } else {
    console.error('Invalid admin key');
    return 'Invalid admin key';
  }
};

// Toggle test protections in development mode
const toggleTestProtections = (enable = null) => {
  // If enable is not provided, toggle the current state
  if (enable === null) {
    const currentState = localStorage.getItem('aya_test_protections') === 'true';
    enable = !currentState;
  }
  
  localStorage.setItem('aya_test_protections', enable.toString());
  console.log(`Test protections ${enable ? 'enabled' : 'disabled'}`);
  return `Test protections ${enable ? 'enabled' : 'disabled'}. Reload the page for changes to take effect.`;
};

// Make the toggle functions globally available
window.__toggleAyaAdmin = toggleAdminMode;
window.__toggleTestProtections = toggleTestProtections;

// Log the current state of protections for debugging
console.log('Protection Status:', {
  isProduction,
  debugEnabled,
  testProtectionsEnabled,
  adminModeActive: isAdminMode(),
  protectionsEnabled: shouldEnableProtections()
});

export { scoreManager, setupAntiDebug, toggleAdminMode, toggleTestProtections, shouldEnableProtections }; 