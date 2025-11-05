# Gas Analysis Report - Ostium Automation Upkeeps

## Overview
This report analyzes gas consumption patterns for Ostium's automation upkeep contracts to enable gas estimation based on calldata.

## Transaction Analysis

### 1. PriceUpkeep Transaction
**Contract:** `OstiumPriceUpKeep.sol`
**Function:** `performUpkeep(bytes calldata performData)`

**Transaction Link:** https://dashboard.tenderly.co/hivemind/project/tx/0xd930f5a44dc13686442e71dda8a17aad1165e489568c17cb73c037d9ae1be11e/

#### Calldata Structure:
```solidity
(bytes memory chainlinkReport, uint256 orderId) = abi.decode(performData, (bytes, uint256))
```

#### Operations Per Call:
- **Batch Size:** 1 price request per transaction (single order)
- **Key Operations:**
  1. Decode calldata
  2. Verify order is initiated
  3. Decode Chainlink report
  4. Calculate Chainlink verification fee
  5. Verify price data with ChainlinkVerifierProxy (external call with ETH transfer)
  6. Decode price data (price, bid, ask)
  7. Validate timestamp and feedId
  8. Call fulfill() which routes to appropriate callback based on OrderType
  9. Delete order from storage

#### Gas Breakdown Components:
- **Base Cost:** Transaction overhead + function call
- **Storage Reads:**
  - `isForwarder[msg.sender]` (warm/cold)
  - `orders[orderId]` (warm/cold)
  - Registry contract addresses (callbacks, pairsStorage, verifierProxy)
  - Pair feed lookup
- **External Calls:**
  - `verifierProxy.s_feeManager()` - view call
  - `feeManager.getFeeAndReward()` - view call
  - `verifierProxy.verify{value}()` - state-changing + ETH transfer
  - Callback function (varies by OrderType):
    - `openTradeMarketCallback()`
    - `closeTradeMarketCallback()`
    - `executeAutomationOpenOrderCallback()`
    - `executeAutomationCloseOrderCallback()`
    - `handleRemoveCollateral()`
- **Storage Writes:**
  - Delete `orders[orderId]` (gas refund)

#### Expected Gas Range:
```
Total Gas Used: [PENDING DATA]
Gas per Price Request: [PENDING DATA]
```

---

### 2. TradesUpkeep Transaction
**Contract:** `OstiumTradesUpKeep.sol`
**Function:** `performUpkeep(bytes calldata performData)`

**Transaction Link:** https://dashboard.tenderly.co/tx/0xe213e4335d2913ff948ebdb7b9453ba09201498e2aded88a4ba03a986980c43e/

#### Calldata Structure:
```solidity
(SimplifiedTradeId[] memory trades, uint256 timestamp) = abi.decode(performData, (SimplifiedTradeId[], uint256))

struct SimplifiedTradeId {
    address trader;
    uint256 pairId;
    uint256 index;
    IOstiumTradingStorage.LimitOrder limitOrder;
}
```

#### Operations Per Call:
- **Batch Size:** N trades per transaction (example: 8 trades)
- **Key Operations:**
  1. Decode calldata (array + timestamp)
  2. For each trade in array:
     - Check if trader != address(0)
     - Call `trading.executeAutomationOrder()` with parameters
     - Emit `AutomationPerformed` event

#### Gas Breakdown Components:
- **Base Cost:** Transaction overhead + function call
- **Per-Trade Cost (loop iteration):**
  - Array element read (trader, pairId, index, limitOrder)
  - Address zero check
  - External call to `trading.executeAutomationOrder()`
    - Cast uint256 → uint16 (pairId)
    - Cast uint256 → uint8 (index)
  - Event emission
- **Storage Reads:**
  - `isForwarder[msg.sender]` (once per tx)
  - Registry contract address lookup (once per tx)

#### Expected Gas Range:
```
Total Gas Used: [PENDING DATA]
Number of Trades: [PENDING DATA]
Gas per Trade: [PENDING DATA]
Base Gas (fixed): [PENDING DATA]
Variable Gas (per trade): [PENDING DATA]
```

---

## Gas Estimation Formula

### PriceUpkeep (Single Price Request):
```
Total Gas = BASE_GAS + PRICE_VERIFICATION_GAS + CALLBACK_GAS
```

Where:
- `BASE_GAS` = Transaction base + storage reads + calldata decoding
- `PRICE_VERIFICATION_GAS` = Chainlink verification + decoding + validation
- `CALLBACK_GAS` = Varies by OrderType (5 different callbacks possible)

### TradesUpkeep (Multiple Trades):
```
Total Gas = BASE_GAS + (NUM_TRADES × PER_TRADE_GAS)
```

Where:
- `BASE_GAS` = Transaction base + forwarder check + array decoding + registry lookup
- `PER_TRADE_GAS` = executeAutomationOrder() + event emission
- `NUM_TRADES` = Length of SimplifiedTradeId[] array

---

## Calldata Size Analysis

### PriceUpkeep Calldata:
- Function selector: 4 bytes
- Tuple offset: 32 bytes
- Chainlink report offset: 32 bytes
- Order ID: 32 bytes
- Chainlink report length: 32 bytes
- Chainlink report data: ~variable (typically 300-500 bytes)
- **Estimated Total: ~500-600 bytes**

### TradesUpkeep Calldata:
- Function selector: 4 bytes
- Tuple offset: 32 bytes
- Array offset: 32 bytes
- Timestamp: 32 bytes
- Array length: 32 bytes
- Per trade: 128 bytes (address + uint256 + uint256 + uint8 enum)
- **Formula: 132 + (128 × NUM_TRADES) bytes**
- **Example (8 trades): 132 + 1024 = 1156 bytes**

---

## Gas Cost Breakdown by Category

### PriceUpkeep Gas Categories:
| Category | Operation | Est. Gas | Notes |
|----------|-----------|----------|-------|
| Base | TX overhead + calldata | TBD | 21000 + ~16 gas/byte |
| Storage | Warm SLOAD × 5 | TBD | ~100 gas each |
| Verification | Chainlink verify() | TBD | External contract |
| Callback | Execute callback | TBD | Varies significantly |
| Storage Delete | Delete order | TBD | Gas refund (~15000) |

### TradesUpkeep Gas Categories:
| Category | Operation | Est. Gas | Notes |
|----------|-----------|----------|-------|
| Base | TX overhead + calldata | TBD | 21000 + ~16 gas/byte |
| Fixed | Forwarder + registry | TBD | ~2-3 SLOADs |
| Per Trade | executeAutomationOrder() | TBD | External call |
| Events | 8 × AutomationPerformed | TBD | ~375 gas each |

---

## Required Data for Completion

Please provide the following from Tenderly:

### PriceUpkeep Transaction:
- [ ] Total gas used
- [ ] Gas breakdown by function calls
- [ ] OrderType for the specific transaction
- [ ] Callback contract gas consumption

### TradesUpkeep Transaction:
- [ ] Total gas used
- [ ] Number of trades processed
- [ ] Gas breakdown showing loop iterations
- [ ] executeAutomationOrder() gas per call

---

## Estimation Tool (Once Data Available)

```javascript
// PriceUpkeep Estimator
function estimatePriceUpkeepGas(orderType) {
    const baseGas = [BASE_VALUE];
    const verificationGas = [VERIFICATION_VALUE];
    const callbackGas = {
        'MARKET_OPEN': [VALUE],
        'MARKET_CLOSE': [VALUE],
        'LIMIT_OPEN': [VALUE],
        'LIMIT_CLOSE': [VALUE],
        'REMOVE_COLLATERAL': [VALUE]
    };
    return baseGas + verificationGas + callbackGas[orderType];
}

// TradesUpkeep Estimator
function estimateTradesUpkeepGas(numTrades) {
    const baseGas = [BASE_VALUE];
    const perTradeGas = [PER_TRADE_VALUE];
    return baseGas + (numTrades * perTradeGas);
}
```

---

## Calldata Detection Logic

```javascript
function analyzePerformUpkeepCalldata(calldata) {
    const functionSelector = calldata.slice(0, 10); // 0x + 8 chars

    // Decode to determine contract type
    const decoded = ethers.utils.defaultAbiCoder.decode(
        ['bytes', 'uint256'],
        '0x' + calldata.slice(10)
    );

    // If first param is bytes (Chainlink report), it's PriceUpkeep
    if (decoded[0].length > 100) {
        return {
            type: 'PriceUpkeep',
            orderId: decoded[1],
            estimatedGas: estimatePriceUpkeepGas('UNKNOWN')
        };
    }

    // Otherwise try TradesUpkeep structure
    const tradesDecoded = ethers.utils.defaultAbiCoder.decode(
        ['tuple(address,uint256,uint256,uint8)[]', 'uint256'],
        '0x' + calldata.slice(10)
    );

    return {
        type: 'TradesUpkeep',
        numTrades: tradesDecoded[0].length,
        timestamp: tradesDecoded[1],
        estimatedGas: estimateTradesUpkeepGas(tradesDecoded[0].length)
    };
}
```

---

## Next Steps

1. Extract actual gas values from Tenderly transactions
2. Calculate averages and variances
3. Build regression model for gas estimation
4. Validate against multiple transaction samples
5. Create automation cost prediction dashboard

---

*Report Status: INCOMPLETE - Awaiting transaction data*
*Last Updated: 2025-11-05*
