// Helper function to determine environment based on wallet network
const getEnvironmentFromNetwork = (walletNetwork) => {
    switch (walletNetwork?.toLowerCase()) {
        case 'testnet':
            return 'testnet';
        case 'mainnet':
            return 'mainnet';
        default:
            console.warn('Unknown network, defaulting to mainnet:', walletNetwork);
            return 'mainnet';
    }
};

const config = {
    apiBaseUrl: 'https://ayagame.onrender.com',
    // Initialize with mainnet as default
    network: 'mainnet',
    
    // Package IDs for different networks
    packageId: {
        testnet: import.meta.env.VITE_APP_TESTNET_PACKAGE_ID,
        mainnet: import.meta.env.VITE_APP_MAINNET_PACKAGE_ID
    },
    
    // Payment Config IDs
    paymentConfigId: {
        testnet: import.meta.env.VITE_APP_TESTNET_PAYMENT_CONFIG_ID,
        mainnet: import.meta.env.VITE_APP_MAINNET_PAYMENT_CONFIG_ID
    },
    
    // Payment Recipients
    recipients: {
        testnet: {
            primary: import.meta.env.VITE_APP_TESTNET_PRIMARY_RECIPIENT,
            secondary: import.meta.env.VITE_APP_TESTNET_SECONDARY_RECIPIENT,
            tertiary: import.meta.env.VITE_APP_TESTNET_TERTIARY_RECIPIENT,
            rewards: import.meta.env.VITE_APP_TESTNET_REWARDS_RECIPIENT
        },
        mainnet: {
            primary: import.meta.env.VITE_APP_MAINNET_PRIMARY_RECIPIENT,
            secondary: import.meta.env.VITE_APP_MAINNET_SECONDARY_RECIPIENT,
            tertiary: import.meta.env.VITE_APP_MAINNET_TERTIARY_RECIPIENT,
            rewards: import.meta.env.VITE_APP_MAINNET_REWARDS_RECIPIENT
        }
    },
    
    // Payment Shares (same for both networks)
    shares: {
        primary: parseInt(import.meta.env.VITE_APP_PRIMARY_SHARE),
        secondary: parseInt(import.meta.env.VITE_APP_SECONDARY_SHARE),
        tertiary: parseInt(import.meta.env.VITE_APP_TERTIARY_SHARE),
        rewards: parseInt(import.meta.env.VITE_APP_REWARDS_SHARE)
    },
    
    api: {
        scores: {
            submit: (gameMode) => `https://ayagame.onrender.com/api/scores/submit/${gameMode}`,
            leaderboard: (type, mode) => `https://ayagame.onrender.com/api/scores/leaderboard/${type}/${mode}`,
            web2: {
                leaderboard: 'https://ayagame.onrender.com/api/web2/leaderboard',
                submit: 'https://ayagame.onrender.com/api/web2/scores'
            }
        }
    },
    
    paymentConfig: {
        totalAmount: parseInt(import.meta.env.VITE_APP_TOTAL_AMOUNT),
        minBalance: parseInt(import.meta.env.VITE_APP_TOTAL_AMOUNT) + 50000000, // Adding 0.05 SUI for gas
    },
    // Regular payment tiers for paid mode
    paymentTiers: {
        tier3: {
          amount: 400000000,   // 0.4 SUI in MIST
          plays: 1,
          label: "A Quickie"
        },
        tier2: {
          amount: 800000000,   // 0.8 SUI in MIST
          plays: 2,
          label: "Short Break"
        },
        tier1: {
          amount: 1000000000,  // 1.0 SUI in MIST
          plays: 3,
          label: "Degen Time!"
        }
    },
    
    // Separate configuration for score submissions
    scoreSubmissionTiers: {
        firstPlace: {
            amount: 2000000000,  // 2.0 SUI in MIST
            label: "Submit your score for First Place",
            rankRequired: 1
        },
        topThree: {
            amount: 1800000000,  // 1.8 SUI in MIST
            label: "Submit your score for Top 3",
            rankRequired: 3
        },
        topEight: {
            amount: 1500000000,  // 1.5 SUI in MIST
            label: "Submit your score for Top 8",
            rankRequired: 8
        }
    },
    
    debug: {
        enabled: import.meta.env.VITE_APP_DEBUG_MODE === 'true',
        logLevel: import.meta.env.VITE_APP_LOG_LEVEL
    },
    
    // Function to update config based on wallet network
    updateNetwork: function(walletNetwork) {
        const newNetwork = getEnvironmentFromNetwork(walletNetwork);
        if (this.network !== newNetwork) {
            this.network = newNetwork;
            if (this.debug.enabled) {
                console.log(`Network updated to ${this.network}`);
                console.log('Using Package ID:', this.getCurrentPackageId());
                console.log('Using Payment Config ID:', this.getCurrentPaymentConfigId());
                console.log('Using Recipients:', this.getCurrentRecipients());
            }
        }
    },

    // Getter functions for network-dependent values
    getCurrentPackageId: function() {
        return this.packageId[this.network];
    },
    
    getCurrentPaymentConfigId: function() {
        return this.paymentConfigId[this.network];
    },
    
    getCurrentRecipients: function() {
        return this.recipients[this.network];
    }
};

// Validate configuration in development
if (import.meta.env.DEV) {
    console.log('Current configuration:', {
        environment: config.network,
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
        'paymentConfig.recipients.tertiary',
        'paymentConfig.recipients.rewards'
    ];

    requiredConfig.forEach(path => {
        const value = path.split('.').reduce((obj, key) => obj && obj[key], config);
        if (!value) {
            console.warn(`Missing required configuration: ${path}`);
        }
    });
}

export default config;
