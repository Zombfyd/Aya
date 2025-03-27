import config from '../config/config';

// Add token price state
let tokenPrices = {
  SUI: null,
  AYA: null
};

// Add function to update token prices
export const updateTokenPrices = (prices) => {
  tokenPrices = prices;
};

/**
 * Calculate the final amount for a purchase based on discounts
 * @param {BigInt|number} baseAmount - The base amount in MIST
 * @param {boolean} isNFTVerified - Whether the user has verified NFTs for a discount
 * @param {boolean} isAyaPayment - Whether the payment is made with AYA token (25% discount)
 * @returns {BigInt} - The final amount after discounts
 */
export const calculateDiscountedAmount = (baseAmount, isNFTVerified, isAyaPayment) => {
  // Convert to number for calculations
  let amount = typeof baseAmount === 'bigint' ? Number(baseAmount) : Number(baseAmount);
  
  if (isAyaPayment) {
    // Convert SUI amount to AYA equivalent using current price ratio
    if (tokenPrices.SUI && tokenPrices.AYA) {
      amount = amount * (tokenPrices.SUI / tokenPrices.AYA);
    }
    
    // Apply 25% AYA discount
    amount = amount * 0.75;
    
    // Apply NFT discount if applicable
    if (isNFTVerified) {
      amount = amount * 0.5;
    }
    
    return BigInt(Math.floor(amount));
  }
  
  // For SUI payments, use BigInt calculations
  const amountBigInt = typeof baseAmount === 'bigint' ? baseAmount : BigInt(baseAmount);
  
  // Only apply NFT discount for SUI
  if (isNFTVerified) {
    return amountBigInt / BigInt(2);
  }
  
  return amountBigInt;
};

/**
 * Calculate the number of play attempts based on payment amount
 * @param {number|BigInt} paymentAmount - The payment amount in MIST
 * @param {number} playsRequested - Number of plays requested
 * @returns {number} - The number of play attempts
 */
export const calculatePlayAttempts = (paymentAmount, playsRequested) => {
  // Base cost for a single play attempt
  const baseCostPerPlay = 400000000; // 0.4 SUI in MIST
  
  // Parse payment amount to number
  const amount = typeof paymentAmount === 'bigint' ? Number(paymentAmount) : Number(paymentAmount);
  
  // Calculate total plays based on the payment amount
  return Math.min(playsRequested, Math.floor(amount / baseCostPerPlay));
};

/**
 * Calculate the cost for a specific number of play attempts
 * @param {number} plays - Number of play attempts
 * @param {boolean} isNFTVerified - Whether the user has verified NFTs for a discount
 * @param {boolean} isAyaPayment - Whether the payment is made with AYA token
 * @returns {BigInt} - The total cost in MIST or AYA base units
 */
export const calculatePlayAttemptsCost = (plays, isNFTVerified, isAyaPayment) => {
  // Base cost per play in SUI (0.4 SUI in MIST)
  const baseCostPerPlay = 400000000;
  
  // Calculate total base cost in SUI MIST
  const totalCostSui = baseCostPerPlay * plays;
  
  if (isAyaPayment) {
    // Get AYA and SUI decimals
    const SUI_DECIMALS = 9; // 9 decimals for SUI
    const AYA_DECIMALS = 6; // 6 decimals for AYA
    
    // Convert SUI MIST to SUI base units
    const suiBaseAmount = totalCostSui / Math.pow(10, SUI_DECIMALS);
    
    // Convert SUI amount to AYA equivalent using current price ratio
    let ayaAmount = suiBaseAmount;
    if (tokenPrices.SUI && tokenPrices.AYA) {
      ayaAmount = suiBaseAmount * (tokenPrices.SUI / tokenPrices.AYA);
    }
    
    // Apply 25% AYA discount
    ayaAmount = ayaAmount * 0.75;
    
    // Apply NFT discount if applicable
    if (isNFTVerified) {
      ayaAmount = ayaAmount * 0.5;
    }
    
    // Convert to AYA base units and return as BigInt
    return BigInt(Math.floor(ayaAmount * Math.pow(10, AYA_DECIMALS)));
  } else {
    // For SUI payments, use BigInt calculations
    const totalCostBigInt = BigInt(totalCostSui);
    
    // Apply NFT discount if applicable
    return isNFTVerified ? totalCostBigInt / BigInt(2) : totalCostBigInt;
  }
};

/**
 * Format MIST value to SUI with appropriate precision
 * @param {BigInt|number} mistValue - Value in MIST
 * @param {number} precision - Decimal precision
 * @returns {string} - Formatted SUI value
 */
export const formatMistToSui = (mistValue, precision = 2) => {
  const value = typeof mistValue === 'bigint' ? mistValue : BigInt(mistValue);
  const suiValue = Number(value) / 1_000_000_000;
  return suiValue.toFixed(precision);
};

/**
 * Calculate the max play attempts that can be purchased with given balance
 * @param {BigInt|number} balance - User's balance in MIST or AYA base units
 * @param {boolean} isNFTVerified - Whether user has verified NFTs
 * @param {boolean} isAyaPayment - Whether using AYA token
 * @returns {number} - Max play attempts
 */
export const calculateMaxPlayAttempts = (balance, isNFTVerified, isAyaPayment) => {
  if (!balance || balance === 0) {
    console.log("Zero balance detected - maxPlayAttempts will be 0");
    return 0;
  }
  
  // Log initial values
  console.log("=== calculateMaxPlayAttempts START ===");
  console.log("Input values:", { 
    balance: typeof balance === 'bigint' ? balance.toString() : balance, 
    isNFTVerified, 
    isAyaPayment,
    tokenPrices
  });
  
  // Base cost is always in SUI (0.4 SUI in MIST)
  const baseCostPerPlay = 400000000;
  
  // Convert balance to number for calculations
  const balanceToUse = typeof balance === 'bigint' ? Number(balance) : Number(balance);
  console.log("Balance converted to number:", balanceToUse);
  
  let effectiveCostPerPlay;
  
  if (isAyaPayment && tokenPrices.SUI && tokenPrices.AYA) {
    const SUI_DECIMALS = 9; // 9 decimals for SUI
    const AYA_DECIMALS = 6; // 6 decimals for AYA
    
    console.log("Calculating AYA cost per play:");
    console.log("1. Base SUI cost:", baseCostPerPlay);
    
    // Convert SUI MIST to SUI base units
    const suiBaseAmount = baseCostPerPlay / Math.pow(10, SUI_DECIMALS);
    console.log("2. SUI base amount:", suiBaseAmount);
    
    // Convert SUI cost to AYA equivalent using current price ratio
    const priceRatio = tokenPrices.SUI / tokenPrices.AYA;
    const ayaBaseAmount = suiBaseAmount * priceRatio;
    console.log("3. After price ratio conversion:", {
      suiPrice: tokenPrices.SUI,
      ayaPrice: tokenPrices.AYA,
      ratio: priceRatio,
      ayaBaseAmount
    });
    
    // Apply 25% AYA discount
    const discountedAyaAmount = ayaBaseAmount * 0.75;
    console.log("4. After 25% AYA discount:", discountedAyaAmount);
    
    // Apply NFT discount if applicable
    const finalAyaBaseAmount = isNFTVerified ? discountedAyaAmount * 0.5 : discountedAyaAmount;
    console.log("5. After NFT discount (if applicable):", finalAyaBaseAmount);
    
    // Convert to AYA base units
    effectiveCostPerPlay = finalAyaBaseAmount * Math.pow(10, AYA_DECIMALS);
    console.log("6. Effective cost per play in AYA base units:", effectiveCostPerPlay);
    
    // Calculate max attempts
    const maxAttempts = Math.floor(balanceToUse / effectiveCostPerPlay);
    console.log("7. Max attempts calculation:", {
      ayaBalance: balanceToUse,
      costPerPlay: effectiveCostPerPlay,
      division: balanceToUse / effectiveCostPerPlay,
      maxAttempts: maxAttempts
    });
    
    const finalMaxAttempts = Math.min(1000, maxAttempts);
    console.log("8. Final max attempts (capped at 1000):", finalMaxAttempts);
    console.log("=== calculateMaxPlayAttempts END ===");
    
    return finalMaxAttempts;
  } else {
    // For SUI payments:
    effectiveCostPerPlay = baseCostPerPlay;
    
    // Apply NFT discount if applicable
    if (isNFTVerified) {
      effectiveCostPerPlay = effectiveCostPerPlay * 0.5;
    }
    
    const maxAttempts = Math.floor(balanceToUse / effectiveCostPerPlay);
    
    console.log("SUI payment calculation:", {
      baseCost: baseCostPerPlay,
      effectiveCost: effectiveCostPerPlay,
      suiBalance: balanceToUse,
      maxAttempts: maxAttempts
    });
    
    return Math.min(1000, maxAttempts);
  }
};

/**
 * Format play attempts cost for display
 * @param {number} plays - Number of play attempts
 * @param {boolean} isNFTVerified - Whether user has verified NFTs
 * @param {boolean} isAyaPayment - Whether using AYA token
 * @returns {Object} - Formatted cost information
 */
export const formatPlayAttemptsCost = (plays, isNFTVerified, isAyaPayment) => {
  const totalCost = calculatePlayAttemptsCost(plays, isNFTVerified, isAyaPayment);
  
  // Get token decimals based on payment type
  const tokenDecimals = isAyaPayment ? 6 : 9; // AYA has 6 decimals, SUI has 9
  
  // Format to appropriate token value based on token type
  let formattedTokenValue;
  if (isAyaPayment) {
    // AYA typically shows whole numbers
    const ayaValue = Number(totalCost) / Math.pow(10, tokenDecimals);
    formattedTokenValue = Math.round(ayaValue).toString();
  } else {
    // SUI shows 2 decimal places
    const suiValue = Number(totalCost) / Math.pow(10, tokenDecimals);
    formattedTokenValue = suiValue.toFixed(2);
  }
  
  // Calculate original cost without discounts for comparison (always in SUI)
  const originalCost = BigInt(400000000) * BigInt(plays); // 0.4 SUI per play in MIST
  
  // Format original cost to SUI
  const originalFormattedSui = formatMistToSui(originalCost);
  
  // Calculate discount percentage
  let discountPercentage = 0;
  if (isAyaPayment) discountPercentage += 25;
  if (isNFTVerified) discountPercentage += isAyaPayment ? 37.5 : 50; // 50% of remaining after AYA discount
  
  return {
    totalCostMist: totalCost.toString(),
    totalCostSui: formattedTokenValue,
    originalCostSui: originalFormattedSui,
    discountPercentage,
    discountApplied: discountPercentage > 0,
    plays
  };
}; 