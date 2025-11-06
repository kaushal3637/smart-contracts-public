# Ostium Automation System

Production-ready automation for Ostium's three upkeep contracts.

## Quick Start

```bash
# 1. Install dependencies
npm install ethers dotenv winston axios

# 2. Setup configuration
cp config/.env.example config/.env
nano config/.env  # Add your values

# 3. Verify setup
node scripts/verify-config.js

# 4. Start automation
npm start

# Or with PM2 for production
pm2 start ecosystem.config.js
```

## Architecture

```
automation/
├── config/           # Configuration files
├── scripts/          # Automation scripts for each upkeep
├── monitors/         # Event monitors and batch optimizers
├── utils/            # Shared utilities
├── logs/             # Log files
└── index.js          # Main orchestrator
```

## Key Scripts

### Main Orchestrator (`index.js`)

Coordinates all three upkeep automations:
- Starts event listeners for each contract
- Manages batch optimization for TradesUpkeep
- Handles gas price monitoring
- Implements circuit breaker for safety
- Provides health check endpoint

### Price Upkeep (`scripts/price-upkeep.js`)

Automates PriceUpkeep with Chainlink Data Streams:
1. Listens for `PriceRequested` events
2. Fetches Chainlink report for the requested feedId + timestamp
3. Estimates gas cost
4. Calls `performUpkeep(chainlinkReport, orderId)`

### Private Price Upkeep (`scripts/private-price-upkeep.js`)

Automates PrivatePriceUpkeep with Ostium Oracle:
1. Listens for `PriceRequested` events
2. Fetches Ostium oracle report
3. Verifies signature
4. Calls `performUpkeep(ostiumReport, orderId)`

### Trades Upkeep (`scripts/trades-upkeep.js`)

Automates TradesUpkeep with batch optimization:
1. Monitors pending automation orders in Trading contract
2. Groups trades by type and pair for efficiency
3. Waits for optimal batch size (or timeout)
4. Calls `performUpkeep(trades[], timestamp)`

## Implementation Details

### Event Monitoring

All three upkeeps work by listening to blockchain events:

**PriceUpkeep Events:**
```solidity
event PriceRequested(
    uint256 indexed orderId,
    bytes32 indexed feedId,
    uint256 timestamp
);
```

**Monitoring Code:**
```javascript
const priceUpkeepContract = new ethers.Contract(
    config.contracts.priceUpkeep,
    PRICE_UPKEEP_ABI,
    provider
);

priceUpkeepContract.on('PriceRequested', async (orderId, feedId, timestamp) => {
    console.log(`Price requested: ${orderId}`);

    // 1. Fetch Chainlink report
    const report = await chainlink.getReport(feedId, timestamp);

    // 2. Estimate gas
    const gasEstimate = await estimateGas('PriceUpkeep', orderId);

    // 3. Check gas price acceptable
    if (await isGasPriceAcceptable(gasEstimate)) {
        // 4. Execute
        await executePriceUpkeep(report, orderId);
    } else {
        // Queue for later when gas is lower
        queueForRetry(orderId, report);
    }
});
```

### Batch Optimization (TradesUpkeep)

The batch optimizer groups trades for maximum efficiency:

```javascript
class BatchOptimizer {
    constructor() {
        this.pendingTrades = [];
        this.lastBatchTime = Date.now();
    }

    addTrade(trade) {
        this.pendingTrades.push(trade);

        // Check if we should execute
        if (this.shouldExecuteBatch()) {
            this.executeBatch();
        }
    }

    shouldExecuteBatch() {
        const batchSize = this.pendingTrades.length;
        const waitTime = Date.now() - this.lastBatchTime;

        return (
            batchSize >= config.batching.maxBatchSize ||
            (batchSize >= config.batching.minBatchSize && waitTime > config.batching.maxWaitTime)
        );
    }

    async executeBatch() {
        if (this.pendingTrades.length === 0) return;

        // Separate by type for optimization
        const openTrades = this.pendingTrades.filter(t => t.type === 'OPEN');
        const closeTrades = this.pendingTrades.filter(t => t.type !== 'OPEN');

        // Execute separately if configured
        if (config.batching.batchByType) {
            if (openTrades.length >= config.batching.minBatchSize) {
                await executeTradesUpkeep(openTrades);
            }
            if (closeTrades.length >= config.batching.minBatchSize) {
                await executeTradesUpkeep(closeTrades);
            }
        } else {
            await executeTradesUpkeep(this.pendingTrades);
        }

        this.pendingTrades = [];
        this.lastBatchTime = Date.now();
    }
}
```

### Gas Price Management

Dynamic gas pricing based on urgency and market conditions:

```javascript
async function getGasPrice() {
    const strategy = config.gas.strategy;

    switch (strategy) {
        case 'fast':
            return await provider.getGasPrice() * 1.2;

        case 'standard':
            return await provider.getGasPrice();

        case 'slow':
            return await provider.getGasPrice() * 0.8;

        case 'custom':
            return ethers.utils.parseUnits(config.gas.customGasPrice.toString(), 'gwei');

        case 'dynamic':
            // Fetch from gas oracle
            const oraclePrice = await fetchGasOraclePrice();
            return Math.min(oraclePrice, ethers.utils.parseUnits(config.gas.maxGasPrice.toString(), 'gwei'));

        default:
            return await provider.getGasPrice();
    }
}

async function isGasPriceAcceptable(estimatedGas) {
    const currentGas = await getGasPrice();
    const currentGasGwei = parseFloat(ethers.utils.formatUnits(currentGas, 'gwei'));
    const maxGasGwei = config.gas.maxGasPrice;

    if (currentGasGwei > maxGasGwei) {
        logger.warn(`Gas price too high: ${currentGasGwei} Gwei > ${maxGasGwei} Gwei`);
        return false;
    }

    return true;
}
```

### Error Handling & Retry Logic

Robust error handling with exponential backoff:

```javascript
async function executeWithRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            logger.error(`Attempt ${attempt} failed:`, error.message);

            if (attempt === maxRetries) {
                // Final attempt failed
                await alertManager.sendCriticalAlert('Execution failed after retries', error);
                throw error;
            }

            // Wait before retry (exponential backoff)
            const delay = config.execution.retryDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
}

async function executePriceUpkeep(report, orderId) {
    return executeWithRetry(async () => {
        // Simulate first (if enabled)
        if (config.execution.enableSimulation) {
            const simulation = await simulateTransaction(priceUpkeepContract, 'performUpkeep', [report, orderId]);

            if (!simulation.success) {
                throw new Error(`Simulation failed: ${simulation.error}`);
            }
        }

        // Execute real transaction
        const tx = await priceUpkeepContract.performUpkeep(report, orderId, {
            gasLimit: gasEstimate * 1.2, // 20% buffer
            gasPrice: await getGasPrice(),
        });

        logger.info(`Transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait(config.confirmations);

        logger.info(`Transaction confirmed: ${tx.hash} (block ${receipt.blockNumber})`);

        // Update metrics
        metrics.recordExecution('PriceUpkeep', receipt.gasUsed);

        return receipt;
    });
}
```

### Circuit Breaker

Automatic safety mechanism to pause on repeated failures:

```javascript
class CircuitBreaker {
    constructor() {
        this.failures = 0;
        this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
        this.lastFailure = null;
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            // Check if enough time has passed to try again
            if (Date.now() - this.lastFailure > config.safety.circuitBreaker.resetTime) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN - system paused due to repeated failures');
            }
        }

        try {
            const result = await fn();

            // Success - reset if in HALF_OPEN
            if (this.state === 'HALF_OPEN') {
                this.state = 'CLOSED';
                this.failures = 0;
                logger.info('Circuit breaker reset to CLOSED');
            }

            return result;
        } catch (error) {
            this.failures++;
            this.lastFailure = Date.now();

            if (this.failures >= config.safety.circuitBreaker.threshold) {
                this.state = 'OPEN';
                await alertManager.sendCriticalAlert('Circuit breaker OPENED - automation paused', {
                    failures: this.failures,
                    lastError: error.message,
                });
            }

            throw error;
        }
    }

    reset() {
        this.state = 'CLOSED';
        this.failures = 0;
        logger.info('Circuit breaker manually reset');
    }
}
```

## Production Deployment

### Using PM2

```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'ostium-automation',
        script: './automation/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production'
        },
        error_file: './automation/logs/error.log',
        out_file: './automation/logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
    }]
};
```

```bash
# Start
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs ostium-automation

# Restart
pm2 restart ostium-automation

# Save configuration
pm2 save

# Auto-start on boot
pm2 startup
```

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy automation files
COPY automation/ ./automation/
COPY src/ ./src/

# Setup user
RUN addgroup -g 1001 -S ostium && \
    adduser -S -u 1001 -G ostium ostium && \
    chown -R ostium:ostium /app

USER ostium

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

EXPOSE 8080 9090

CMD ["node", "automation/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  automation:
    build: .
    container_name: ostium-automation
    restart: unless-stopped
    env_file:
      - automation/config/.env
    volumes:
      - ./automation/logs:/app/automation/logs
      - ./automation/data:/app/automation/data
    ports:
      - "8080:8080"  # Health check
      - "9090:9090"  # Metrics
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Monitoring

### Prometheus Metrics

```javascript
// utils/metrics.js
const promClient = require('prom-client');

const register = new promClient.Registry();

const executionsTotal = new promClient.Counter({
    name: 'ostium_upkeep_executions_total',
    help: 'Total number of upkeep executions',
    labelNames: ['contract', 'status'],
    registers: [register]
});

const gasUsed = new promClient.Histogram({
    name: 'ostium_upkeep_gas_used',
    help: 'Gas used per execution',
    labelNames: ['contract'],
    buckets: [100000, 300000, 600000, 900000, 1500000],
    registers: [register]
});

const batchSize = new promClient.Histogram({
    name: 'ostium_batch_size',
    help: 'Number of trades per batch',
    buckets: [1, 3, 5, 8, 10, 15, 20],
    registers: [register]
});

// Expose metrics
const express = require('express');
const app = express();

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(9090);
```

### Health Check

```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {},
        blockchain: {},
        forwarder: {}
    };

    try {
        // Check blockchain connection
        const blockNumber = await provider.getBlockNumber();
        health.blockchain.connected = true;
        health.blockchain.blockNumber = blockNumber;

        // Check forwarder balance
        const balance = await provider.getBalance(config.forwarderAddress);
        health.forwarder.balance = ethers.utils.formatEther(balance);
        health.forwarder.address = config.forwarderAddress;

        // Check service status
        health.services.priceUpkeep = monitors.priceUpkeep.isRunning() ? 'running' : 'stopped';
        health.services.privatePriceUpkeep = monitors.privatePriceUpkeep.isRunning() ? 'running' : 'stopped';
        health.services.tradesUpkeep = monitors.tradesUpkeep.isRunning() ? 'running' : 'stopped';

        res.json(health);
    } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;
        res.status(503).json(health);
    }
});
```

## Testing

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Test against testnet
TEST_MODE=true \
RPC_URL_PRIMARY=https://goerli.infura.io/v3/YOUR_KEY \
node automation/scripts/test-integration.js
```

### Load Testing

```bash
# Simulate high load
node automation/scripts/load-test.js --trades 100 --duration 60
```

## Cost Analysis

Based on actual transaction data:

| Upkeep | Avg Gas | @ 0.5 Gwei | @ 2 Gwei | Executions/Day | Daily Cost (@0.5 Gwei) |
|--------|---------|------------|----------|----------------|------------------------|
| PriceUpkeep | 872k | $1.31 | $5.23 | 100 | $131 |
| PrivatePriceUpkeep | 600k | $0.90 | $3.60 | 200 | $180 |
| TradesUpkeep (batch) | 171k/trade | $0.26 | $1.03 | 500 trades | $130 |
| **TOTAL** | - | - | - | - | **~$441/day** |

**Monthly estimate:** ~$13,230 @ 0.5 Gwei, ~$52,920 @ 2 Gwei

## Support

- Documentation: See [AUTOMATION_GUIDE.md](../AUTOMATION_GUIDE.md)
- Issues: GitHub Issues
- Discord: Ostium Community

---

**Note:** This is a reference implementation. Customize based on your specific requirements.
