// Helper function to determine environment based on wallet network
const getEnvironmentFromNetwork = (walletNetwork) => {
    switch (walletNetwork?.toLowerCase()) {
        case 'testnet':
            return 'development';
        case 'mainnet':
            return 'production';
        default:
            // Fallback to development if network is unknown
            console.warn('Unknown network, defaulting to development:', walletNetwork);
            return 'development';
    }
};

const config = {
    apiBaseUrl: 'https://ayagame.onrender.com',
    // Initialize with default, will be updated when wallet connects
    network: 'testnet',
    environment: 'development',
    packageId: {
        development: import.meta.env.VITE_TESTNET_PACKAGE_ID,
        production: import.meta.env.VITE_MAINNET_PACKAGE_ID
    },
    paymentConfigId: {
        development: import.meta.env.VITE_TESTNET_PAYMENT_CONFIG_ID,
        production: import.meta.env.VITE_MAINNET_PAYMENT_CONFIG_ID
    },
    api: {
        scores: {
            submit: (gameMode) => `https://ayagame.onrender.com/api/scores/submit/${gameMode}`,
            leaderboard: (type, mode) => `https://ayagame.onrender.com/api/scores/leaderboard/${type}/${mode}`
        }
    },
    paymentConfig: {
        totalAmount: 200000000, // 0.2 SUI in MIST
        minBalance: 250000000,  // 0.25 SUI in MIST for gas buffer
    },
    
    // Function to update config based on wallet network
    updateNetwork: function(walletNetwork) {
        this.network = walletNetwork?.toLowerCase() || 'testnet';
        this.environment = getEnvironmentFromNetwork(this.network);
        console.log(`Network updated to ${this.network} (${this.environment})`);
    },

    // Getter functions for network-dependent values
    getCurrentPackageId: function() {
        return this.packageId[this.environment];
    },
    
    getCurrentPaymentConfigId: function() {
        return this.paymentConfigId[this.environment];
    }
};

// Validate configuration in development
if (import.meta.env.DEV) {
    console.log('Current configuration:', {
        environment: config.environment,
        network: config.network,
        hasPackageId: !!config.getCurrentPackageId(),
        hasPaymentConfigId: !!config.getCurrentPaymentConfigId(),
        totalAmount: config.paymentConfig.totalAmount,
        debug: config.debug
    });

    // Validate required configuration
    const requiredConfig = [
        'getCurrentPackageId',
        'getCurrentPaymentConfigId',
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
