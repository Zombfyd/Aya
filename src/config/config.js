const config = {
    apiBaseUrl: 'https://ayagame.onrender.com',
    network: process.env.NODE_ENV === 'development' ? 'testnet' : 'mainnet',
    packageId: process.env.REACT_APP_PACKAGE_ID || 'your_default_package_id',
    paymentConfig: {
        minBalance: 200000000, // 0.2 SUI in MIST
        totalAmount: 200000000
    },
    api: {
        scores: {
            submit: (gameMode) => `https://ayagame.onrender.com/api/scores/submit/${gameMode}`,
            leaderboard: (type, mode) => `https://ayagame.onrender.com/api/scores/leaderboard/${type}/${mode}`
        }
    },
    environment: import.meta.env.VITE_APP_ENVIRONMENT,
    paymentConfigId: import.meta.env.VITE_APP_PAYMENT_CONFIG_ID,
    
    // Payment configuration
    paymentConfig: {
        totalAmount: parseInt(import.meta.env.VITE_APP_TOTAL_AMOUNT) || 200000000, // 0.2 SUI in MIST
        minBalance: 250000000,  // 0.25 SUI in MIST for gas buffer
        recipients: {
            primary: import.meta.env.VITE_APP_PRIMARY_RECIPIENT,
            secondary: import.meta.env.VITE_APP_SECONDARY_RECIPIENT,
            tertiary: import.meta.env.VITE_APP_TERTIARY_RECIPIENT
        },
        shares: {
            primary: parseInt(import.meta.env.VITE_APP_PRIMARY_SHARE) || 6000,   // 60%
            secondary: parseInt(import.meta.env.VITE_APP_SECONDARY_SHARE) || 2500, // 25%
            tertiary: parseInt(import.meta.env.VITE_APP_TERTIARY_SHARE) || 1500   // 15%
        }
    },

    // Debug settings
    debug: {
        enabled: import.meta.env.VITE_APP_DEBUG_MODE === 'true',
        logLevel: import.meta.env.VITE_APP_LOG_LEVEL || 'error'
    }
};

// Validate configuration in development
if (import.meta.env.DEV) {
    console.log('Current configuration:', {
        environment: config.environment,
        network: config.network,
        hasPackageId: !!config.packageId,
        hasPaymentConfigId: !!config.paymentConfigId,
        totalAmount: config.paymentConfig.totalAmount,
        debug: config.debug
    });

    // Validate required configuration
    const requiredConfig = [
        'packageId',
        'paymentConfigId',
        'paymentConfig.recipients.primary',
        'paymentConfig.recipients.secondary',
        'paymentConfig.recipients.tertiary'
    ];

    requiredConfig.forEach(path => {
        const value = path.split('.').reduce((obj, key) => obj && obj[key], config);
        if (!value) {
            console.warn(`Missing required configuration: ${path}`);
        }
    });
}

export default config;
