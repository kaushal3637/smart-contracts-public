# Ostium Automation Production Guide
## Complete Setup for PriceUpkeep, PrivatePriceUpkeep, and TradesUpkeep

**Version:** 1.0.0
**Last Updated:** 2025-11-06
**Status:** Production Ready ✅

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Quick Start](#3-quick-start)
4. [Detailed Setup](#4-detailed-setup)
5. [Running the Automation](#5-running-the-automation)
6. [Monitoring & Alerting](#6-monitoring--alerting)
7. [Troubleshooting](#7-troubleshooting)
8. [Advanced Configuration](#8-advanced-configuration)
9. [Production Deployment](#9-production-deployment)
10. [Security Best Practices](#10-security-best-practices)

---

## 1. Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    OSTIUM AUTOMATION SYSTEM                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Event Monitors  │────▶│  Batch Optimizer │────▶│    Executors     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                                                    │
        │                                                    │
        ▼                                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BLOCKCHAIN LAYER                          │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────┐   │
│  │  PriceUpkeep   │  │ PrivatePrice     │  │  TradesUpkeep  │   │
│  │  (Chainlink)   │  │ Upkeep           │  │  (Batch)       │   │
│  └────────────────┘  └──────────────────┘  └────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      OSTIUM CORE CONTRACTS                       │
│   Trading │ TradingStorage │ PriceRouter │ PairsStorage          │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
PriceUpkeep Flow (Chainlink):
  1. PriceRequested event emitted
  2. Monitor detects event
  3. Fetch Chainlink Data Streams report
  4. Estimate gas
  5. Call performUpkeep(chainlinkReport, orderId)
  6. Callback executed (openTrade/closeTrade/etc)

PrivatePriceUpkeep Flow (Ostium Oracle):
  1. PriceRequested event emitted
  2. Monitor detects event
  3. Fetch Ostium oracle report
  4. Estimate gas
  5. Call performUpkeep(ostiumReport, orderId)
  6. Callback executed

TradesUpkeep Flow (Batched):
  1. Monitor checks pending automation orders
  2. Batch optimizer groups trades
  3. For each trade: call Trading.executeAutomationOrder()
     → Triggers PriceRequested
  4. Batch trades with same pair/type
  5. Call performUpkeep(trades[], timestamp)
  6. Each trade triggers price request
```

---

## 2. Prerequisites

### System Requirements

- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **Operating System:** Linux (Ubuntu 20.04+), macOS, or Windows (WSL2)
- **RAM:** Minimum 2GB, recommended 4GB
- **Storage:** Minimum 10GB free space
- **Network:** Stable internet connection with <100ms latency to RPC endpoint

### Required Accounts & Keys

1. **Ethereum/Arbitrum Wallet**
   - Private key for forwarder address
   - Must be registered in upkeep contracts
   - Funded with ETH for gas

2. **RPC Provider Account**
   - Alchemy, Infura, QuickNode, or self-hosted node
   - WebSocket support recommended
   - Rate limit: ≥300 requests/second

3. **Chainlink Data Streams Access** (for PriceUpkeep)
   - API key and secret
   - Subscription with sufficient credits
   - Sign up: https://chain.link/data-streams

4. **Ostium Oracle Access** (for PrivatePriceUpkeep)
   - API endpoint URL
   - API key
   - Internal Ostium deployment

5. **Monitoring Services** (optional but recommended)
   - Slack workspace + incoming webhook
   - Discord server + webhook
   - Email SMTP credentials
   - PagerDuty account

### Software Dependencies

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18+
npm --version   # Should be v9+

# Install PM2 for process management (production)
npm install -g pm2

# Install development tools (optional)
npm install -g nodemon
```

---

## 3. Quick Start

### Step 1: Clone and Setup

```bash
# Navigate to project directory
cd /path/to/smart-contracts-public

# Install dependencies
npm install

# Create automation environment file
cp automation/config/.env.example automation/config/.env

# Edit configuration
nano automation/config/.env
```

### Step 2: Configure Essential Settings

Edit `automation/config/.env` with your values:

```bash
# MINIMUM REQUIRED CONFIGURATION

# Blockchain
RPC_URL_PRIMARY=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=42161

# Wallet (⚠️ KEEP SECURE!)
FORWARDER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
FORWARDER_ADDRESS=0xYOUR_FORWARDER_ADDRESS

# Contracts
PRICE_UPKEEP_PROXY=0x...
PRIVATE_PRICE_UPKEEP_PROXY=0x...
TRADES_UPKEEP_PROXY=0x...
REGISTRY_ADDRESS=0x...
PRICE_ROUTER_ADDRESS=0x...
TRADING_ADDRESS=0x...

# Chainlink (for PriceUpkeep)
CHAINLINK_API_KEY=your_api_key
CHAINLINK_API_SECRET=your_api_secret

# Ostium Oracle (for PrivatePriceUpkeep)
OSTIUM_ORACLE_URL=https://your-oracle.com
OSTIUM_ORACLE_API_KEY=your_key

# Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Enable upkeeps
ENABLE_PRICE_UPKEEP=true
ENABLE_PRIVATE_PRICE_UPKEEP=true
ENABLE_TRADES_UPKEEP=true
```

### Step 3: Test Configuration

```bash
# Verify configuration
node automation/scripts/verify-config.js

# Expected output:
# ✅ All required environment variables present
# ✅ RPC connection successful
# ✅ Forwarder wallet loaded
# ✅ Contracts accessible
# ✅ Forwarder registered in upkeep contracts
```

### Step 4: Dry Run (Simulation Mode)

```bash
# Enable dry run mode
echo "DRY_RUN_MODE=true" >> automation/config/.env

# Start automation in dry run
node automation/index.js

# Expected output:
# 🚀 Ostium Automation Starting...
# 📋 Configuration Summary:
# ✓ Dry Run Mode: YES (transactions will be simulated only)
# ✓ Monitors started for all enabled upkeeps
# 📊 Waiting for events...
```

### Step 5: Go Live

```bash
# Disable dry run mode
sed -i 's/DRY_RUN_MODE=true/DRY_RUN_MODE=false/' automation/config/.env

# Start automation with PM2
pm2 start automation/index.js --name "ostium-automation"

# Monitor logs
pm2 logs ostium-automation

# Save PM2 configuration
pm2 save

# Setup auto-restart on system reboot
pm2 startup
```

---

## 4. Detailed Setup

### 4.1 Register Forwarder Address

Your forwarder address must be registered in each upkeep contract.

**Method 1: Using Ostium Governance**

```bash
# Create governance proposal to register forwarder
# (Requires governance permissions)

# For PriceUpkeep
cast send $PRICE_UPKEEP_PROXY \
  "registerForwarder(address)" \
  $FORWARDER_ADDRESS \
  --private-key $GOVERNANCE_PRIVATE_KEY

# For PrivatePriceUpkeep
cast send $PRIVATE_PRICE_UPKEEP_PROXY \
  "registerForwarder(address)" \
  $FORWARDER_ADDRESS \
  --private-key $GOVERNANCE_PRIVATE_KEY

# For TradesUpkeep
cast send $TRADES_UPKEEP_PROXY \
  "registerForwarder(address)" \
  $FORWARDER_ADDRESS \
  --private-key $GOVERNANCE_PRIVATE_KEY
```

**Method 2: Using Automation Script**

```bash
# Run the registration helper
node automation/scripts/register-forwarder.js

# This script will:
# 1. Check if forwarder is already registered
# 2. If not, submit registration transaction
# 3. Wait for confirmation
# 4. Verify registration successful
```

**Verification:**

```bash
# Check if forwarder is registered
cast call $PRICE_UPKEEP_PROXY \
  "isForwarder(address)(bool)" \
  $FORWARDER_ADDRESS

# Expected output: true
```

### 4.2 Fund Forwarder Wallet

Your forwarder needs ETH for gas. Calculate required balance:

```javascript
// Estimated monthly gas costs (at 0.5 Gwei average):

// PriceUpkeep: ~872k gas per operation
//   - 100 operations/day × 30 days = 3,000 ops
//   - 3,000 × 872k = 2.616B gas
//   - @ 0.5 Gwei = 1.308 ETH/month
//   - @ $3000 ETH = $3,924/month

// PrivatePriceUpkeep: ~600k gas per operation
//   - 200 operations/day × 30 days = 6,000 ops
//   - 6,000 × 600k = 3.6B gas
//   - @ 0.5 Gwei = 1.8 ETH/month
//   - @ $3000 ETH = $5,400/month

// TradesUpkeep: ~171k gas per trade (batched)
//   - 500 trades/day × 30 days = 15,000 trades
//   - 15,000 × 171k = 2.565B gas
//   - @ 0.5 Gwei = 1.2825 ETH/month
//   - @ $3000 ETH = $3,847/month

// TOTAL ESTIMATED: ~4.4 ETH/month @ 0.5 Gwei
// RECOMMENDED: Fund with 5-10 ETH for safety buffer
```

**Fund the wallet:**

```bash
# Send ETH to forwarder
cast send $FORWARDER_ADDRESS --value 5ether --private-key $YOUR_FUNDING_KEY

# Verify balance
cast balance $FORWARDER_ADDRESS

# Setup low balance alerts
# (Configured in .env with LOW_BALANCE_THRESHOLD_ETH)
```

### 4.3 Configure Chainlink Data Streams

1. **Sign up for Chainlink Data Streams:**
   - Visit: https://docs.chain.link/data-streams
   - Create account and subscribe
   - Note your API key and secret

2. **Configure feeds:**

```bash
# List all feed IDs used by Ostium
node automation/scripts/list-price-feeds.js

# Output example:
# BTC/USD: 0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8
# ETH/USD: 0x000362205e10b3a147d02792eccee483dca6c7b44ecce7012cb8c6e0b68b3ae9
# ... (more feeds)
```

3. **Test Chainlink connection:**

```bash
node automation/scripts/test-chainlink.js

# Expected output:
# ✅ Chainlink API connection successful
# ✅ Retrieved report for BTC/USD
# ✅ Report verified successfully
```

### 4.4 Configure Ostium Oracle

1. **Get Oracle Access:**
   - Contact Ostium team for oracle endpoint
   - Receive API key and endpoint URL

2. **Test Oracle Connection:**

```bash
node automation/scripts/test-ostium-oracle.js

# Expected output:
# ✅ Ostium Oracle connection successful
# ✅ Retrieved price for BTC/USD
# ✅ Signature verified
```

### 4.5 Setup Monitoring & Alerts

#### Slack Integration

1. Create Slack incoming webhook:
   - Go to https://api.slack.com/apps
   - Create new app → Incoming Webhooks
   - Activate webhooks
   - Add to workspace
   - Copy webhook URL

2. Configure in `.env`:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

3. Test:
```bash
node automation/scripts/test-slack-alert.js
```

#### Discord Integration

1. Create Discord webhook:
   - Server Settings → Integrations → Webhooks
   - New Webhook → Copy URL

2. Configure:
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

#### Email Alerts

1. Setup SMTP (Gmail example):
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Generate in Google Account settings
ALERT_EMAIL_TO=team@yourdomain.com
```

2. Test:
```bash
node automation/scripts/test-email-alert.js
```

---

## 5. Running the Automation

### 5.1 Development Mode

```bash
# Start with nodemon (auto-restart on file changes)
npm run dev

# Or directly with node
node automation/index.js

# With verbose logging
LOG_LEVEL=debug node automation/index.js
```

### 5.2 Production Mode with PM2

```bash
# Start all services
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs ostium-automation

# Monitor
pm2 monit

# Restart
pm2 restart ostium-automation

# Stop
pm2 stop ostium-automation

# Delete
pm2 delete ostium-automation
```

### 5.3 Docker Deployment

```bash
# Build image
docker build -t ostium-automation .

# Run container
docker run -d \
  --name ostium-automation \
  --env-file automation/config/.env \
  --restart unless-stopped \
  -v $(pwd)/automation/logs:/app/automation/logs \
  ostium-automation

# View logs
docker logs -f ostium-automation

# Stop
docker stop ostium-automation
```

### 5.4 Systemd Service (Linux)

```bash
# Create service file
sudo nano /etc/systemd/system/ostium-automation.service

# Add content (see below)
# Enable and start
sudo systemctl enable ostium-automation
sudo systemctl start ostium-automation

# Check status
sudo systemctl status ostium-automation

# View logs
sudo journalctl -u ostium-automation -f
```

**Service file content:**

```ini
[Unit]
Description=Ostium Automation Service
After=network.target

[Service]
Type=simple
User=ostium
WorkingDirectory=/home/ostium/smart-contracts-public
ExecStart=/usr/bin/node automation/index.js
Restart=always
RestartSec=10
EnvironmentFile=/home/ostium/smart-contracts-public/automation/config/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/home/ostium/smart-contracts-public/automation/logs

[Install]
WantedBy=multi-user.target
```

---

## 6. Monitoring & Alerting

### 6.1 Metrics Dashboard

Access Prometheus metrics at `http://localhost:9090/metrics`

**Key Metrics:**

- `ostium_upkeep_executions_total` - Total executions by type
- `ostium_upkeep_failures_total` - Failed executions
- `ostium_upkeep_gas_used` - Gas consumption
- `ostium_batch_size` - Batch sizes for TradesUpkeep
- `ostium_queue_length` - Pending operations
- `ostium_execution_duration_seconds` - Execution time
- `ostium_forwarder_balance_eth` - Wallet balance

### 6.2 Grafana Dashboard

```bash
# Import Grafana dashboard
# File: automation/monitoring/grafana-dashboard.json

# Panels include:
# - Execution rate (ops/minute)
# - Success rate (%)
# - Gas consumption (Gwei/hour)
# - Batch efficiency
# - Forwarder balance
# - Alert history
```

### 6.3 Alert Conditions

Alerts are triggered when:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Execution failure | 3 consecutive | Slack + email |
| High gas price | >20 Gwei | Pause + alert |
| Low forwarder balance | <0.1 ETH | Critical alert |
| Stuck transaction | >5 minutes | Alert + retry |
| Circuit breaker triggered | 5 failures | Pause + page |
| RPC connection lost | N/A | Switch to backup |

### 6.4 Health Check Endpoint

```bash
# Check health
curl http://localhost:8080/health

# Response:
{
  "status": "healthy",
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "priceUpkeep": "running",
    "privatePriceUpkeep": "running",
    "tradesUpkeep": "running"
  },
  "blockchain": {
    "connected": true,
    "latency": 45,
    "blockNumber": 12345678
  },
  "forwarder": {
    "address": "0x...",
    "balance": "2.5 ETH",
    "nonce": 1234
  }
}
```

---

## 7. Troubleshooting

### Common Issues

#### Issue 1: "NotForwarder" Error

**Symptom:**
```
Error: execution reverted: NotForwarder(0x...)
```

**Solution:**
```bash
# Verify forwarder is registered
cast call $PRICE_UPKEEP_PROXY \
  "isForwarder(address)(bool)" \
  $FORWARDER_ADDRESS

# If false, register it
node automation/scripts/register-forwarder.js
```

#### Issue 2: High Gas Failures

**Symptom:**
```
Warning: Gas price 15 Gwei exceeds max 10 Gwei, skipping execution
```

**Solution:**
```bash
# Option 1: Increase max gas price
echo "MAX_GAS_PRICE=20" >> automation/config/.env

# Option 2: Wait for lower gas
# Automation will automatically retry when gas drops

# Option 3: Use gas oracle
echo "GAS_ORACLE_URL=https://api.blocknative.com/gasprices/blockprices" >> .env
echo "GAS_ORACLE_API_KEY=your_key" >> .env
```

#### Issue 3: Chainlink Report Expired

**Symptom:**
```
Error: InvalidPrice - timestamp mismatch
```

**Solution:**
```bash
# Reduce polling interval
echo "CHAINLINK_REFRESH_INTERVAL=5" >> .env

# Increase timeout tolerance
# (This requires contract upgrade, contact team)
```

#### Issue 4: Insufficient Funds

**Symptom:**
```
Error: insufficient funds for gas * price + value
```

**Solution:**
```bash
# Check balance
cast balance $FORWARDER_ADDRESS

# Fund wallet
cast send $FORWARDER_ADDRESS --value 1ether --private-key $FUNDING_KEY

# Setup auto-funding (advanced)
node automation/scripts/auto-fund.js
```

#### Issue 5: RPC Rate Limiting

**Symptom:**
```
Error: rate limit exceeded
```

**Solution:**
```bash
# Add backup RPC
echo "RPC_URL_SECONDARY=https://backup-rpc.com" >> .env

# Reduce polling frequency
echo "PRICE_UPKEEP_POLL_INTERVAL=30" >> .env

# Enable request batching
echo "ENABLE_RPC_BATCHING=true" >> .env
```

### Debug Mode

Enable comprehensive debugging:

```bash
# Enable debug logging
LOG_LEVEL=debug \
VERBOSE=true \
node automation/index.js

# Output shows:
# - Every event detected
# - Gas estimation details
# - Transaction simulation results
# - Exact failure reasons
# - Full stack traces
```

### Test Individual Components

```bash
# Test PriceUpkeep only
ENABLE_PRIVATE_PRICE_UPKEEP=false \
ENABLE_TRADES_UPKEEP=false \
node automation/index.js

# Test with specific order ID
node automation/scripts/execute-single-order.js --orderId 42260

# Simulate transaction
node automation/scripts/simulate-upkeep.js \
  --contract PriceUpkeep \
  --orderId 42260
```

---

## 8. Advanced Configuration

### 8.1 Gas Optimization

```bash
# Dynamic gas pricing based on urgency
GAS_PRICE_STRATEGY=dynamic

# Custom gas ladder (Gwei)
GAS_URGENT=2.0      # Execute within 1 block
GAS_FAST=1.0        # Execute within 3 blocks
GAS_STANDARD=0.5    # Execute within 10 blocks
GAS_SLOW=0.3        # Execute eventually

# Priority by order type
MARKET_ORDERS_URGENT=true
LIMIT_ORDERS_FAST=true
REMOVE_COLLATERAL_SLOW=true
```

### 8.2 Batch Optimization

```bash
# Advanced batching strategy
BATCHING_STRATEGY=smart  # smart | simple | aggressive

# Smart batching parameters
BATCH_SIMILAR_PAIRS=true          # Batch same trading pair
BATCH_SAME_DIRECTION=true         # Batch all longs or all shorts
BATCH_MIN_GAS_SAVINGS=10000       # Min gas saved to batch
BATCH_MAX_DELAY_SECONDS=60        # Max delay for better batch

# Separate queues by priority
ENABLE_PRIORITY_QUEUE=true
LIQUIDATION_PRIORITY=critical
SL_TP_PRIORITY=high
OPEN_PRIORITY=medium
```

### 8.3 MEV Protection

```bash
# Enable Flashbots/MEV protection
MEV_PROTECTION=true
MEV_RELAY_URL=https://relay.flashbots.net

# Private transaction pool
PRIVATE_TX_POOL=true

# Disable public mempool broadcast
PUBLIC_MEMPOOL=false
```

### 8.4 Multi-Forwarder Setup

```bash
# Load balancing across forwarders
FORWARDERS=0xForwarder1,0xForwarder2,0xForwarder3
FORWARDER_KEYS=0xKey1,0xKey2,0xKey3

# Strategy: round-robin | least-nonce | random
FORWARDER_STRATEGY=least-nonce

# Failover
AUTO_FAILOVER=true
FAILOVER_THRESHOLD=3  # Switch after 3 failures
```

---

## 9. Production Deployment

### 9.1 Pre-Deployment Checklist

- [ ] Environment variables reviewed and validated
- [ ] Forwarder address registered in all contracts
- [ ] Forwarder funded with sufficient ETH (≥5 ETH recommended)
- [ ] RPC endpoints tested and rate limits confirmed
- [ ] Chainlink Data Streams access verified
- [ ] Ostium Oracle connection tested
- [ ] Alert webhooks configured and tested
- [ ] Backup RPC endpoint configured
- [ ] Database persistence enabled (if using)
- [ ] Log rotation configured
- [ ] Monitoring dashboard setup
- [ ] Circuit breaker thresholds set
- [ ] Dry run completed successfully
- [ ] Security audit of .env file (no exposed keys)
- [ ] PM2 or systemd service configured
- [ ] Auto-restart on failure enabled
- [ ] Health check endpoint responding
- [ ] Documentation reviewed by team

### 9.2 Deployment Steps

```bash
# 1. Clone to production server
ssh production-server
cd /opt/ostium
git clone https://github.com/your-org/smart-contracts-public.git
cd smart-contracts-public

# 2. Install dependencies
npm ci --production

# 3. Copy production config
cp automation/config/.env.production automation/config/.env

# 4. Verify configuration
node automation/scripts/verify-config.js

# 5. Run integration tests
npm run test:integration

# 6. Start with PM2
pm2 start ecosystem.config.js --env production

# 7. Monitor for 1 hour
pm2 logs ostium-automation --lines 1000

# 8. Verify metrics
curl http://localhost:8080/health

# 9. Setup monitoring alerts
node automation/scripts/setup-monitoring.js

# 10. Save PM2 config
pm2 save
pm2 startup
```

### 9.3 High Availability Setup

**Load Balanced Configuration:**

```
┌────────────────────────────────────────┐
│         Load Balancer (HAProxy)        │
└────────────────────────────────────────┘
           │                │
           ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│   Instance 1     │  │   Instance 2     │
│  (Active)        │  │  (Standby)       │
└──────────────────┘  └──────────────────┘
           │                │
           ▼                ▼
┌────────────────────────────────────────┐
│      Shared PostgreSQL Database        │
└────────────────────────────────────────┘
```

**Setup:**

```bash
# Instance 1
INSTANCE_ID=1
ACTIVE_MODE=true
DATABASE_TYPE=postgres

# Instance 2
INSTANCE_ID=2
ACTIVE_MODE=false  # Standby
DATABASE_TYPE=postgres

# Health check determines active instance
# Only active instance executes transactions
# Standby monitors and takes over on failure
```

---

## 10. Security Best Practices

### 10.1 Key Management

```bash
# NEVER commit .env file
echo "automation/config/.env" >> .gitignore

# Use environment-specific configs
automation/config/.env.development
automation/config/.env.staging
automation/config/.env.production

# Encrypt sensitive values
npm install --save dotenv-vault
npx dotenv-vault new
npx dotenv-vault push

# Use hardware wallet for production (advanced)
FORWARDER_TYPE=ledger
LEDGER_PATH="m/44'/60'/0'/0/0"
```

### 10.2 Network Security

```bash
# Firewall rules (UFW example)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 8080/tcp    # Health check
sudo ufw allow 9090/tcp    # Metrics (restrict to monitoring server)
sudo ufw enable

# Restrict API access by IP
ALLOWED_IPS=10.0.0.0/8,192.168.1.0/24

# Use VPN for sensitive endpoints
CHAINLINK_API_VPN=true
```

### 10.3 Access Control

```bash
# File permissions
chmod 600 automation/config/.env
chmod 700 automation/scripts/*.js

# User isolation
sudo useradd -m -s /bin/bash ostium
sudo chown -R ostium:ostium /opt/ostium
sudo -u ostium pm2 start ecosystem.config.js
```

### 10.4 Audit Logging

```bash
# Enable comprehensive audit logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_PATH=./automation/logs/audit.log

# Log everything:
# - All transactions sent
# - Gas prices used
# - Failed attempts
# - Configuration changes
# - Access attempts
```

### 10.5 Regular Security Maintenance

```bash
# Weekly tasks
npm audit fix              # Fix dependencies
git pull                   # Update code
pm2 update                 # Update PM2

# Monthly tasks
# - Review access logs
# - Rotate API keys
# - Update RPC endpoints
# - Verify forwarder balance
# - Test failover procedures
```

---

## Appendix: Complete File Structure

```
smart-contracts-public/
├── automation/
│   ├── config/
│   │   ├── .env.example          # Template configuration
│   │   ├── .env                   # Your configuration (gitignored)
│   │   └── config.js              # Configuration loader
│   ├── scripts/
│   │   ├── price-upkeep.js        # PriceUpkeep automation
│   │   ├── private-price-upkeep.js # PrivatePriceUpkeep automation
│   │   ├── trades-upkeep.js       # TradesUpkeep automation
│   │   ├── verify-config.js       # Configuration validator
│   │   ├── register-forwarder.js  # Forwarder registration
│   │   ├── test-chainlink.js      # Chainlink connection test
│   │   └── test-ostium-oracle.js  # Oracle connection test
│   ├── monitors/
│   │   ├── event-monitor.js       # Event listener
│   │   ├── batch-optimizer.js     # Batch optimization logic
│   │   └── gas-monitor.js         # Gas price monitoring
│   ├── utils/
│   │   ├── logger.js              # Logging utility
│   │   ├── blockchain.js          # Blockchain client
│   │   ├── gas-estimator.js       # Gas estimation
│   │   ├── alert-manager.js       # Alert system
│   │   └── retry.js               # Retry logic
│   ├── monitoring/
│   │   ├── grafana-dashboard.json # Grafana dashboard
│   │   └── prometheus.yml         # Prometheus config
│   ├── logs/
│   │   ├── ostium-automation.log  # Main log file
│   │   └── audit.log              # Audit log
│   ├── index.js                   # Main entry point
│   └── ecosystem.config.js        # PM2 configuration
├── Dockerfile
├── docker-compose.yml
└── AUTOMATION_GUIDE.md            # This file
```

---

## Quick Reference Commands

```bash
# Start automation
pm2 start automation/index.js --name ostium-automation

# View logs
pm2 logs ostium-automation

# Restart
pm2 restart ostium-automation

# Stop
pm2 stop ostium-automation

# Monitor
pm2 monit

# Health check
curl http://localhost:8080/health

# View metrics
curl http://localhost:9090/metrics

# Test Slack alert
node automation/scripts/test-slack-alert.js

# Check forwarder balance
cast balance $FORWARDER_ADDRESS

# Dry run mode
DRY_RUN_MODE=true node automation/index.js

# Debug mode
LOG_LEVEL=debug VERBOSE=true node automation/index.js
```

---

## Support & Resources

- **Documentation:** https://docs.ostium.io
- **Discord:** https://discord.gg/ostium
- **GitHub Issues:** https://github.com/ostium/smart-contracts/issues
- **Email:** support@ostium.io

---

**End of Guide**

*This guide is maintained by the Ostium team. For updates, check the GitHub repository.*
