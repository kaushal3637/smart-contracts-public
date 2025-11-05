#!/usr/bin/env python3
"""
Decode PrivatePriceUpkeep transactions to find gas differences
"""

# Transaction 1: 857,720 gas
tx1_calldata = "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000a7fe600000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000080bd7a3c7a87bfaf72233bafbb7200320cab59cec97418cf61dd78d9c91a2cb83949d24e215086d4b98f694ed4d277332387f6056eb732f65a833fb442e5f9efa6000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000e06ae89eb4d72112188d8d5042fda1e7bb4773ca77d0f0f71fc688e72492053c3600000000000000000000000000000000000000000000000000000000690b4cfe000000000000000000000000000000000000000000000ab20653471e6a000000000000000000000000000000000000000000000000000ab1d938f5568a000000000000000000000000000000000000000000000000000ab222c65741e780000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"

# Transaction 2: 599,574 gas
tx2_calldata = "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000a8000000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000807528532251749cc92ab04608bb739ff73a2bf620a90533bb9ad8b85102b3f8757ca16b9d950f280c2b2fb9677872212fa30fcba4493b44700360502a731ebc92000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000e0051a9d682677ed7ea03763668f7e2098163e3e21f893fbe29016776fc394bd0700000000000000000000000000000000000000000000000000000000690b4e2200000000000000000000000000000000000000000000016edf2d90c57de0000000000000000000000000000000000000000000000000016edb27474ed500000000000000000000000000000000000000000000000000016ee501b48bd380000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"

def decode_tx(calldata, tx_name):
    print(f"\n{'='*60}")
    print(f"{tx_name}")
    print(f"{'='*60}")

    # Decode structure: (bytes report, uint256 orderId)
    # First 32 bytes: offset to bytes
    # Second 32 bytes: orderId

    offset = int(calldata[0:64], 16)
    order_id = int(calldata[64:128], 16)

    print(f"Order ID: {order_id} (0x{order_id:x})")
    print(f"Report offset: {offset} bytes")

    # Report structure starts at offset
    # Next is report length
    report_start = offset * 2  # Convert to hex chars
    report_length_hex = calldata[report_start:report_start+64]
    report_length = int(report_length_hex, 16)

    print(f"Report length: {report_length} bytes")

    # The report data (after length)
    report_data_start = report_start + 64
    report_data = calldata[report_data_start:report_data_start+(report_length*2)]

    print(f"\nReport data breakdown:")
    print(f"  Total report size: {len(report_data)//2} bytes")

    # Decode report structure
    # The report contains nested structure, let's parse what we can see

    # After decoding, the verify() returns:
    # (bytes32 feedId, uint32 timestamp, int192 price, int192 bid, int192 ask, bool isMarketOpen, bool isDayTradingClosed)

    # Let's look at the visible data patterns
    # The calldata shows the actual encoded data we can parse

    # Look for the timestamp (should be around 690b4cfe for tx1, 690b4e22 for tx2)
    if "690b4cfe" in calldata:
        print(f"  ✓ Found timestamp: 0x690b4cfe = {int('690b4cfe', 16)} = {int('690b4cfe', 16)} Unix time")
    elif "690b4e22" in calldata:
        print(f"  ✓ Found timestamp: 0x690b4e22 = {int('690b4e22', 16)} = {int('690b4e22', 16)} Unix time")

    # Look for the boolean flags at the end
    # Last 64 chars should contain isMarketOpen and isDayTradingClosed
    last_128_chars = calldata[-128:]

    # Last 32 bytes (64 hex chars) = isDayTradingClosed
    is_day_trading_closed = int(last_128_chars[-64:], 16)

    # Previous 32 bytes = isMarketOpen
    is_market_open = int(last_128_chars[-128:-64], 16)

    print(f"\n  Market Status:")
    print(f"    isMarketOpen: {bool(is_market_open)} (0x{is_market_open:x})")
    print(f"    isDayTradingClosed: {bool(is_day_trading_closed)} (0x{is_day_trading_closed:x})")

    # Try to extract price values (they're int192, stored as 32-byte words)
    # Looking at the pattern, there are 3 large numbers before the boolean flags
    # These should be price, bid, ask

    # Work backwards from the booleans
    bools_start = len(calldata) - 128

    # Previous 96 bytes (3 x 32 bytes) should be ask, bid, price (in reverse order)
    if bools_start >= 192:
        ask_hex = calldata[bools_start-64:bools_start]
        bid_hex = calldata[bools_start-128:bools_start-64]
        price_hex = calldata[bools_start-192:bools_start-128]

        # These are int192 but stored as uint256, so just parse as large numbers
        # They represent prices in 1e18 format
        ask = int(ask_hex, 16) if ask_hex else 0
        bid = int(bid_hex, 16) if bid_hex else 0
        price = int(price_hex, 16) if price_hex else 0

        if price > 0:
            print(f"\n  Price Data:")
            print(f"    Price: {price} wei = {price/1e18:.4f}")
            print(f"    Bid:   {bid} wei = {bid/1e18:.4f}")
            print(f"    Ask:   {ask} wei = {ask/1e18:.4f}")

    return {
        'order_id': order_id,
        'report_length': report_length,
        'is_market_open': bool(is_market_open),
        'is_day_trading_closed': bool(is_day_trading_closed),
        'calldata_size': len(calldata) // 2
    }

print("="*60)
print("PRIVATE PRICE UPKEEP GAS COMPARISON")
print("="*60)

result1 = decode_tx(tx1_calldata, "Transaction 1 (857,720 gas)")
result2 = decode_tx(tx2_calldata, "Transaction 2 (599,574 gas)")

print(f"\n{'='*60}")
print("COMPARISON SUMMARY")
print(f"{'='*60}")
print(f"\nGas Difference: {857720 - 599574:,} gas ({((857720-599574)/599574*100):.1f}% more in TX1)")
print(f"\nKey Differences:")
print(f"  Order ID difference: {result1['order_id'] - result2['order_id']}")
print(f"  Market Open: TX1={result1['is_market_open']}, TX2={result2['is_market_open']}")
print(f"  Day Trading Closed: TX1={result1['is_day_trading_closed']}, TX2={result2['is_day_trading_closed']}")
print(f"  Calldata size: TX1={result1['calldata_size']} bytes, TX2={result2['calldata_size']} bytes")

print(f"\n{'='*60}")
print("HYPOTHESIS")
print(f"{'='*60}")

if result1['is_market_open'] != result2['is_market_open']:
    print("\n⚠️  MARKET STATUS DIFFERS!")
    print("\nIn PrivatePriceUpKeep.sol (lines 93-97):")
    print("  if (!isMarketOpen) {")
    print("      delete a.price;   // ~5k gas")
    print("      delete a.bid;     // ~5k gas")
    print("      delete a.ask;     // ~5k gas")
    print("  }")
    print("\nThis only accounts for ~15k gas difference, not 258k.")
    print("The main difference is likely in the CALLBACK execution.\n")
else:
    print("\nBoth transactions have same market status.")
    print("Gas difference likely due to:")
    print("  1. Different OrderType (different callback)")
    print("  2. Different callback complexity")
    print("  3. Storage access patterns (cold vs warm)")

print("\n⚡ Main Gas Cost Factors:")
print("   • Callback function type (MARKET_OPEN, MARKET_CLOSE, LIMIT_OPEN, etc.)")
print("   • Callback internal operations (trade creation, closure, updates)")
print("   • Storage state (new trade vs updating existing)")
print("   • Token transfers in callbacks")
print("   • Event emissions")

print("\nTo identify exact cause, need to check:")
print("  1. What OrderType each transaction is")
print("  2. Internal callback execution trace from Tenderly")
print("  3. Storage operations in each callback")
