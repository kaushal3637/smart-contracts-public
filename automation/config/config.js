/**
 * Ostium Automation Configuration Loader
 *
 * Loads and validates configuration from environment variables
 * Provides typed access to all configuration values
 */

require('dotenv').config({ path: __dirname + '/.env' });

class Config {
    constructor() {
        this.validate();
    }

    // ===========================
    // BLOCKCHAIN
    // ===========================

    get rpcUrl() {
        return process.env.RPC_URL_PRIMARY || process.env.RPC_URL;
    }

    get rpcUrlSecondary() {
        return process.env.RPC_URL_SECONDARY;
    }

    get wsUrl() {
        return process.env.RPC_URL_WEBSOCKET;
    }

    get chainId() {
        return parseInt(process.env.CHAIN_ID || '42161');
    }

    get confirmations() {
        return parseInt(process.env.CONFIRMATIONS_REQUIRED || '2');
    }

    // ===========================
    // WALLET
    // ===========================

    get forwarderPrivateKey() {
        return process.env.FORWARDER_PRIVATE_KEY;
    }

    get forwarderAddress() {
        return process.env.FORWARDER_ADDRESS;
    }

    get backupForwarderPrivateKey() {
        return process.env.BACKUP_FORWARDER_PRIVATE_KEY;
    }

    // ===========================
    // CONTRACTS
    // ===========================

    get contracts() {
        return {
            registry: process.env.REGISTRY_ADDRESS,
            trading: process.env.TRADING_ADDRESS,
            tradingStorage: process.env.TRADING_STORAGE_ADDRESS,
            pairsStorage: process.env.PAIRS_STORAGE_ADDRESS,
            priceRouter: process.env.PRICE_ROUTER_ADDRESS,

            // Upkeeps
            priceUpkeep: process.env.PRICE_UPKEEP_ADDRESS,
            privatePriceUpkeep: process.env.PRIVATE_PRICE_UPKEEP_ADDRESS,
            tradesUpkeep: process.env.TRADES_UPKEEP_ADDRESS,

            // Proxies
            priceUpkeepProxy: process.env.PRICE_UPKEEP_PROXY || process.env.PRICE_UPKEEP_ADDRESS,
            privatePriceUpkeepProxy: process.env.PRIVATE_PRICE_UPKEEP_PROXY || process.env.PRIVATE_PRICE_UPKEEP_ADDRESS,
            tradesUpkeepProxy: process.env.TRADES_UPKEEP_PROXY || process.env.TRADES_UPKEEP_ADDRESS,

            // Verifiers
            ostiumVerifier: process.env.OSTIUM_VERIFIER_ADDRESS,
            chainlinkVerifierProxy: process.env.CHAINLINK_VERIFIER_PROXY,
        };
    }

    // ===========================
    // CHAINLINK
    // ===========================

    get chainlink() {
        return {
            apiUrl: process.env.CHAINLINK_API_URL || 'https://api.chain.link/data-streams',
            apiKey: process.env.CHAINLINK_API_KEY,
            apiSecret: process.env.CHAINLINK_API_SECRET,
            refreshInterval: parseInt(process.env.CHAINLINK_REFRESH_INTERVAL || '10'),
        };
    }

    // ===========================
    // OSTIUM ORACLE
    // ===========================

    get ostiumOracle() {
        return {
            url: process.env.OSTIUM_ORACLE_URL,
            apiKey: process.env.OSTIUM_ORACLE_API_KEY,
            signingKey: process.env.OSTIUM_ORACLE_SIGNING_KEY,
        };
    }

    // ===========================
    // GAS
    // ===========================

    get gas() {
        return {
            strategy: process.env.GAS_PRICE_STRATEGY || 'fast',
            customGasPrice: parseFloat(process.env.CUSTOM_GAS_PRICE || '0.5'),
            maxGasPrice: parseFloat(process.env.MAX_GAS_PRICE || '10'),
            oracleUrl: process.env.GAS_ORACLE_URL,
            oracleApiKey: process.env.GAS_ORACLE_API_KEY,
            multiplier: parseFloat(process.env.GAS_MULTIPLIER || '1.1'),
            maxPriorityFee: parseFloat(process.env.MAX_PRIORITY_FEE || '2'),
        };
    }

    // ===========================
    // AUTOMATION
    // ===========================

    get automation() {
        return {
            enablePriceUpkeep: process.env.ENABLE_PRICE_UPKEEP === 'true',
            enablePrivatePriceUpkeep: process.env.ENABLE_PRIVATE_PRICE_UPKEEP === 'true',
            enableTradesUpkeep: process.env.ENABLE_TRADES_UPKEEP === 'true',

            priceUpkeepPollInterval: parseInt(process.env.PRICE_UPKEEP_POLL_INTERVAL || '10') * 1000,
            privatePriceUpkeepPollInterval: parseInt(process.env.PRIVATE_PRICE_UPKEEP_POLL_INTERVAL || '10') * 1000,
            tradesUpkeepPollInterval: parseInt(process.env.TRADES_UPKEEP_POLL_INTERVAL || '5') * 1000,

            startBlock: process.env.START_BLOCK || 'latest',
            maxBlockRange: parseInt(process.env.MAX_BLOCK_RANGE || '10000'),
        };
    }

    // ===========================
    // BATCHING
    // ===========================

    get batching() {
        return {
            minBatchSize: parseInt(process.env.MIN_BATCH_SIZE || '3'),
            maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '15'),
            maxWaitTime: parseInt(process.env.MAX_BATCH_WAIT_TIME || '30') * 1000,
            batchByType: process.env.BATCH_BY_TYPE === 'true',
        };
    }

    // ===========================
    // EXECUTION
    // ===========================

    get execution() {
        return {
            maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.RETRY_DELAY || '5') * 1000,
            txTimeout: parseInt(process.env.TX_TIMEOUT || '120') * 1000,
            enableSimulation: process.env.ENABLE_SIMULATION !== 'false',
            revertOnSimulationFailure: process.env.REVERT_ON_SIMULATION_FAILURE !== 'false',
        };
    }

    // ===========================
    // MONITORING
    // ===========================

    get monitoring() {
        return {
            enabled: process.env.ENABLE_MONITORING !== 'false',
            metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
            healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT || '8080'),
        };
    }

    // ===========================
    // LOGGING
    // ===========================

    get logging() {
        return {
            level: process.env.LOG_LEVEL || 'info',
            toFile: process.env.LOG_TO_FILE === 'true',
            filePath: process.env.LOG_FILE_PATH || './automation/logs/ostium-automation.log',
            rotationDays: parseInt(process.env.LOG_ROTATION_DAYS || '7'),
            verbose: process.env.VERBOSE === 'true',
        };
    }

    // ===========================
    // ALERTING
    // ===========================

    get alerts() {
        return {
            slack: {
                webhookUrl: process.env.SLACK_WEBHOOK_URL,
            },
            discord: {
                webhookUrl: process.env.DISCORD_WEBHOOK_URL,
            },
            email: {
                enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
                smtp: {
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    user: process.env.SMTP_USER,
                    password: process.env.SMTP_PASSWORD,
                },
                to: process.env.ALERT_EMAIL_TO,
            },
            pagerduty: {
                enabled: process.env.PAGERDUTY_ENABLED === 'true',
                integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
            },
            conditions: {
                onFailure: process.env.ALERT_ON_FAILURE !== 'false',
                onHighGas: process.env.ALERT_ON_HIGH_GAS !== 'false',
                onLowBalance: process.env.ALERT_ON_LOW_BALANCE !== 'false',
                onStuckTx: process.env.ALERT_ON_STUCK_TX !== 'false',
            },
            thresholds: {
                lowBalanceEth: parseFloat(process.env.LOW_BALANCE_THRESHOLD_ETH || '0.1'),
                highGasGwei: parseFloat(process.env.HIGH_GAS_THRESHOLD_GWEI || '20'),
                stuckTxTimeout: parseInt(process.env.STUCK_TX_TIMEOUT_SECONDS || '300') * 1000,
            },
        };
    }

    // ===========================
    // PERFORMANCE
    // ===========================

    get performance() {
        return {
            concurrentProcessors: parseInt(process.env.CONCURRENT_PROCESSORS || '3'),
            maxPendingTxs: parseInt(process.env.MAX_PENDING_TXS || '5'),
            mempoolMonitoring: process.env.MEMPOOL_MONITORING === 'true',
            mevProtection: process.env.MEV_PROTECTION === 'true',
            mevRelayUrl: process.env.MEV_RELAY_URL,
        };
    }

    // ===========================
    // SAFETY
    // ===========================

    get safety() {
        return {
            circuitBreaker: {
                enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
                threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
                resetTime: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIME || '300') * 1000,
            },
            rateLimit: {
                enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
                requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
            },
            requireApprovalAboveGas: parseInt(process.env.REQUIRE_APPROVAL_ABOVE_GAS || '1000000'),
            dryRunMode: process.env.DRY_RUN_MODE === 'true',
        };
    }

    // ===========================
    // DATABASE
    // ===========================

    get database() {
        return {
            type: process.env.DATABASE_TYPE || 'sqlite',
            path: process.env.DATABASE_PATH || './automation/data/ostium.db',
            postgres: {
                host: process.env.POSTGRES_HOST || 'localhost',
                port: parseInt(process.env.POSTGRES_PORT || '5432'),
                database: process.env.POSTGRES_DB || 'ostium_automation',
                user: process.env.POSTGRES_USER,
                password: process.env.POSTGRES_PASSWORD,
            },
        };
    }

    // ===========================
    // TESTING
    // ===========================

    get testing() {
        return {
            testMode: process.env.TEST_MODE === 'true',
            testForwarderAddress: process.env.TEST_FORWARDER_ADDRESS,
            enableProfiling: process.env.ENABLE_PROFILING === 'true',
        };
    }

    // ===========================
    // VALIDATION
    // ===========================

    validate() {
        const required = [
            'RPC_URL_PRIMARY',
            'FORWARDER_PRIVATE_KEY',
            'FORWARDER_ADDRESS',
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            console.error('❌ Missing required environment variables:');
            missing.forEach(key => console.error(`   - ${key}`));
            console.error('\n📝 Please copy .env.example to .env and fill in the values\n');

            if (process.env.NODE_ENV === 'production') {
                throw new Error('Missing required environment variables');
            }
        }

        // Validate addresses
        if (this.forwarderAddress && !this.forwarderAddress.startsWith('0x')) {
            throw new Error('Invalid forwarder address format');
        }

        // Warn about missing optional but important configs
        if (!process.env.SLACK_WEBHOOK_URL && !process.env.DISCORD_WEBHOOK_URL) {
            console.warn('⚠️  No alert webhooks configured. You will not receive failure alerts.');
        }

        if (this.automation.enablePriceUpkeep && !this.chainlink.apiKey) {
            console.warn('⚠️  PriceUpkeep enabled but Chainlink API key not configured');
        }

        if (this.automation.enablePrivatePriceUpkeep && !this.ostiumOracle.url) {
            console.warn('⚠️  PrivatePriceUpkeep enabled but Ostium Oracle URL not configured');
        }

        return true;
    }

    // ===========================
    // HELPERS
    // ===========================

    isProduction() {
        return process.env.NODE_ENV === 'production';
    }

    isDevelopment() {
        return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    }

    print() {
        console.log('\n📋 Configuration Summary:');
        console.log('─'.repeat(60));
        console.log(`Chain ID:              ${this.chainId}`);
        console.log(`Forwarder:             ${this.forwarderAddress}`);
        console.log(`Price Upkeep:          ${this.automation.enablePriceUpkeep ? '✓' : '✗'}`);
        console.log(`Private Price Upkeep:  ${this.automation.enablePrivatePriceUpkeep ? '✓' : '✗'}`);
        console.log(`Trades Upkeep:         ${this.automation.enableTradesUpkeep ? '✓' : '✗'}`);
        console.log(`Gas Strategy:          ${this.gas.strategy} (max: ${this.gas.maxGasPrice} Gwei)`);
        console.log(`Dry Run Mode:          ${this.safety.dryRunMode ? 'YES' : 'NO'}`);
        console.log(`Monitoring:            ${this.monitoring.enabled ? '✓' : '✗'}`);
        console.log('─'.repeat(60));
        console.log('');
    }
}

// Export singleton instance
module.exports = new Config();
