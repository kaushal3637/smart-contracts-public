# Quick Start Guide - Ostium Automation

Get your automation running in 5 minutes!

## Prerequisites

- Node.js v18+
- npm v9+
- Funded Ethereum wallet
- Registered forwarder address

## Step 1: Install Dependencies

```bash
cd automation
npm install
```

## Step 2: Configure Environment

```bash
# Copy example configuration
cp config/.env.example config/.env

# Edit with your values
nano config/.env
```

**Minimum required configuration:**

```bash
# Blockchain
RPC_URL_PRIMARY=https://your-rpc-endpoint
CHAIN_ID=42161

# Wallet (⚠️ KEEP SECURE!)
FORWARDER_PRIVATE_KEY=0x...
FORWARDER_ADDRESS=0x...

# Contracts
PRICE_UPKEEP_PROXY=0x...
PRIVATE_PRICE_UPKEEP_PROXY=0x...
TRADES_UPKEEP_PROXY=0x...

# Chainlink
CHAINLINK_API_KEY=...
CHAINLINK_API_SECRET=...

# Ostium Oracle
OSTIUM_ORACLE_URL=https://...
OSTIUM_ORACLE_API_KEY=...

# Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Step 3: Verify Setup

```bash
npm run verify
```

Expected output:
```
✅ Configuration valid
✅ RPC connection successful
✅ Forwarder wallet loaded (0x...)
✅ Balance: 2.5 ETH
✅ Forwarder registered in all upkeeps
✅ Chainlink connection OK
✅ Ostium Oracle connection OK
✅ Ready to start!
```

## Step 4: Test Run (Dry Mode)

```bash
# Enable dry run mode (simulates but doesn't execute)
echo "DRY_RUN_MODE=true" >> config/.env

# Start
npm start
```

Watch for:
```
🚀 Ostium Automation Starting...
✓ PriceUpkeep monitor started
✓ PrivatePriceUpkeep monitor started
✓ TradesUpkeep monitor started
📊 Monitoring blockchain events...
```

## Step 5: Go Live!

```bash
# Disable dry run
sed -i 's/DRY_RUN_MODE=true/DRY_RUN_MODE=false/' config/.env

# Start with PM2
pm2 start ecosystem.config.js --name ostium-automation

# View logs
pm2 logs ostium-automation

# Monitor
pm2 monit
```

## Verification Checklist

- [ ] Configuration file created
- [ ] RPC endpoint responding
- [ ] Forwarder has ETH balance (>1 ETH recommended)
- [ ] Forwarder registered in all upkeep contracts
- [ ] Chainlink API credentials valid
- [ ] Ostium Oracle accessible
- [ ] Slack/Discord webhooks configured
- [ ] Dry run completed successfully
- [ ] Health check endpoint responding (http://localhost:8080/health)

## Common Issues

### Issue: "NotForwarder" error

**Solution:**
```bash
# Check registration status
cast call $PRICE_UPKEEP_PROXY "isForwarder(address)(bool)" $FORWARDER_ADDRESS

# If false, register it (requires governance)
cast send $PRICE_UPKEEP_PROXY "registerForwarder(address)" $FORWARDER_ADDRESS --private-key $GOV_KEY
```

### Issue: "Insufficient funds"

**Solution:**
```bash
# Check balance
cast balance $FORWARDER_ADDRESS

# Fund wallet
cast send $FORWARDER_ADDRESS --value 5ether --private-key $FUNDING_KEY
```

### Issue: Chainlink authentication failed

**Solution:**
- Verify API key and secret in .env
- Check Chainlink subscription is active
- Test connection: `npm run test-chainlink`

## Monitoring

```bash
# View real-time logs
pm2 logs ostium-automation

# Check health
curl http://localhost:8080/health

# View metrics
curl http://localhost:9090/metrics

# Get status
pm2 status
```

## Stopping

```bash
# Stop automation
pm2 stop ostium-automation

# Delete from PM2
pm2 delete ostium-automation

# Or if running directly
# Press Ctrl+C
```

## Next Steps

1. **Setup Monitoring:** Configure Grafana dashboard for visualization
2. **Configure Alerts:** Set thresholds in .env for gas price, balance, etc.
3. **Optimize Batching:** Tune batch size and wait times for TradesUpkeep
4. **Enable Backups:** Setup backup RPC and forwarder
5. **Production Hardening:** See AUTOMATION_GUIDE.md for full production setup

## Support

- Full Guide: [AUTOMATION_GUIDE.md](../AUTOMATION_GUIDE.md)
- README: [README.md](README.md)
- Issues: GitHub Issues
- Discord: Ostium Community

---

**You're all set! Your automation should now be processing upkeeps automatically.**

Monitor the logs and Slack alerts to ensure everything is working correctly.
