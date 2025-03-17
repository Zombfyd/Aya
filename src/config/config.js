// Helper function to determine environment based on vite mode
const getEnvironmentFromMode = () => {
    const mode = import.meta.env.MODE;
    console.log('Current MODE:', mode);
    return mode === 'testnet' ? 'testnet' : 'mainnet';
};

// Helper function to determine environment based on wallet network
const getEnvironmentFromNetwork = (walletNetwork) => {
    console.log('Wallet Network:', walletNetwork);
    switch (walletNetwork?.toLowerCase()) {
        case 'testnet':
            return 'testnet';
        case 'mainnet':
            return 'mainnet';
        default:
            // Use the environment from Vite mode as fallback
            const modeEnv = getEnvironmentFromMode();
            console.log('Falling back to mode environment:', modeEnv);
            return modeEnv;
    }
};

const config = {
    apiBaseUrl: 'https://ayagame.onrender.com',
    // Initialize with environment from Vite mode
    network: getEnvironmentFromMode(),
    
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
        primary: parseInt(import.meta.env.VITE_APP_PRIMARY_SHARE) || 4000,
        secondary: parseInt(import.meta.env.VITE_APP_SECONDARY_SHARE) || 3000,
        tertiary: parseInt(import.meta.env.VITE_APP_TERTIARY_SHARE) || 2000,
        rewards: parseInt(import.meta.env.VITE_APP_REWARDS_SHARE) || 1000
    },
    
    // API endpoints as methods to avoid circular reference
    getApiEndpoints: function() {
        return {
            scores: {
                submit: (gameMode) => `${this.apiBaseUrl}/api/scores/submit/${gameMode}`,
                leaderboard: (type, mode) => `${this.apiBaseUrl}/api/scores/leaderboard/${type}/${mode}`,
                web2: {
                    leaderboard: `${this.apiBaseUrl}/api/web2/leaderboard`,
                    submit: `${this.apiBaseUrl}/api/web2/scores`
                }
            }
        };
    },
    blockberryApiKey: import.meta.env.VITE_APP_BLOCKBERRY_API_KEY,
    paymentConfig: {
        totalAmount: parseInt(import.meta.env.VITE_APP_TOTAL_AMOUNT) || 100000000,
        minBalance: parseInt(import.meta.env.VITE_APP_TOTAL_AMOUNT) || 100000000,
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
        enabled: true, // Always enable debug for testnet
        logLevel: import.meta.env.VITE_APP_LOG_LEVEL || 'debug'
    },
    
    // Function to update config based on wallet network
    updateNetwork: function(walletNetwork) {
        const newNetwork = getEnvironmentFromNetwork(walletNetwork);
        if (this.network !== newNetwork) {
            console.log(`Updating network from ${this.network} to ${newNetwork}`);
            this.network = newNetwork;
            if (this.debug.enabled) {
                console.log('Current configuration:', {
                    environment: this.network,
                    network: this.network,
                    packageId: this.getCurrentPackageId(),
                    paymentConfigId: this.getCurrentPaymentConfigId(),
                    recipients: this.getCurrentRecipients()
                });
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

// Initialize api property after config object is created
config.api = config.getApiEndpoints();

// Debug logging for initial configuration
console.log('Initial configuration:', {
    mode: import.meta.env.MODE,
    environment: config.network,
    network: config.network,
    hasPackageId: !!config.getCurrentPackageId(),
    hasPaymentConfigId: !!config.getCurrentPaymentConfigId(),
    debug: config.debug
});

export default config;
