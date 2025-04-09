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
 * @param {number} paymentAmount - The payment amount in MIST
 * @param {number} playsRequested - Number of plays requested
 * @returns {number} - The number of play attempts
 */
export const calculatePlayAttempts = (paymentAmount, playsRequested) => {
  // Base cost for a single play attempt
  const baseCostPerPlay = 400000000; // 0.4 SUI in MIST
  
  // Calculate total plays based on the payment amount
  return Math.min(playsRequested, Math.floor(paymentAmount / baseCostPerPlay));
};

/**
 * Calculate the cost for a specific number of play attempts
 * @param {number} plays - Number of play attempts
 * @param {boolean} isNFTVerified - Whether the user has verified NFTs for a discount
 * @param {boolean} isAyaPayment - Whether the payment is made with AYA token
 * @returns {BigInt} - The total cost in MIST
 */
export const calculatePlayAttemptsCost = (plays, isNFTVerified, isAyaPayment) => {
  // Base cost is always in SUI (0.4 SUI in MIST)
  const baseCostPerPlay = 400000000;
  
  // Calculate total base cost in SUI MIST
  let totalCostInMist = baseCostPerPlay * plays;
  
  if (isAyaPayment) {
    // ======= COMPLETELY SEPARATE AYA PAYMENT LOGIC =======
    
    // Step 1: Apply NFT discount if applicable (in SUI MIST)
    const discountedSuiAmount = isNFTVerified ? Math.floor(totalCostInMist * 0.5) : totalCostInMist;
    
    // Step 2: Convert SUI from MIST to base units (SUI has 9 decimals)
    const suiBaseAmount = discountedSuiAmount / 1_000_000_000;
    
    // Step 3: Calculate equivalent AYA amount based on price ratio
    let ayaAmount;
    if (tokenPrices.SUI && tokenPrices.AYA) {
      ayaAmount = suiBaseAmount * tokenPrices.SUI / tokenPrices.AYA;
    } else {
      // If prices aren't available, use a conservative estimate
      ayaAmount = suiBaseAmount * 550000; // Current ratio is about 550,000:1
    }
    
    // Step 4: Apply the 25% AYA discount
    const discountedAyaAmount = ayaAmount * 0.75;
    
    // Step 5: Convert to AYA base units (AYA has 6 decimals)
    const ayaCostInBaseUnits = Math.floor(discountedAyaAmount * 1_000_000);
    
    // Step 6: Calculate exact distribution values directly
    // This avoids any further multiplication in GameApp.jsx
    const primary = Math.floor(ayaCostInBaseUnits * 0.6);
    const secondary = Math.floor(ayaCostInBaseUnits * 0.3);
    const tertiary = Math.floor(ayaCostInBaseUnits * 0.2);
    const rewards = Math.floor(ayaCostInBaseUnits * 0.1);
    
    // IMPORTANT: Always return strings for all numeric values to avoid BigInt mixing issues
    return {
      totalCost: ayaCostInBaseUnits.toString(),
      distribution: {
        primary: primary.toString(),
        secondary: secondary.toString(),
        tertiary: tertiary.toString(),
        rewards: rewards.toString()
      }
    };
  } else {
    // ======= SUI PAYMENT LOGIC =======
    // Apply NFT discount if applicable
    const discountedAmount = isNFTVerified ? Math.floor(totalCostInMist * 0.5) : totalCostInMist;
    
    // For SUI payments, return as string
    return discountedAmount.toString();
  }
};

/**
 * Format MIST value to SUI with appropriate precision
 * @param {BigInt|number} mistValue - Value in MIST
 * @param {number} precision - Decimal precision
 * @returns {string} - Formatted SUI value
 */
export const formatMistToSui = (mistValue, precision = 2) => {
  // Handle different input types (BigInt, string, or number)
  let numericValue;
  
  if (mistValue === null || mistValue === undefined) {
    numericValue = 0;
  } else if (typeof mistValue === 'bigint') {
    numericValue = Number(mistValue);
  } else if (typeof mistValue === 'string') {
    // Handle potential non-numeric strings
    numericValue = isNaN(Number(mistValue)) ? 0 : Number(mistValue);
  } else {
    numericValue = mistValue;
  }
  
  const suiValue = numericValue / 1_000_000_000;
  return suiValue.toFixed(precision);
};

/**
 * Calculate the max play attempts that can be purchased with given balance
 * @param {BigInt|number} balance - User's balance in MIST
 * @param {boolean} isNFTVerified - Whether user has verified NFTs
 * @param {boolean} isAyaPayment - Whether using AYA token
 * @returns {number} - Max play attempts
 */
export const calculateMaxPlayAttempts = (balance, isNFTVerified, isAyaPayment) => {
  if (!balance || balance === 0 || balance === '0') {
    console.log("Zero balance detected - maxPlayAttempts will be 0");
    return 0;
  }
  
  console.log("=== calculateMaxPlayAttempts START ===");
  console.log("Input values:", { 
    balance: typeof balance === 'bigint' ? balance.toString() : balance, 
    isNFTVerified, 
    isAyaPayment,
    tokenPrices
  });
  
  // Base cost per play in SUI MIST (0.4 SUI)
  const baseCostPerPlay = 400000000;
  
  // Convert balance to number for calculations
  // Always ensure we're working with a number to avoid BigInt mixing issues
  let balanceToUse;
  if (typeof balance === 'bigint') {
    balanceToUse = Number(balance);
  } else if (typeof balance === 'string') {
    balanceToUse = Number(balance);
  } else {
    balanceToUse = balance;
  }
  
  console.log("Balance converted to number:", balanceToUse);
  
  if (isAyaPayment) {
    // For AYA payments, calculate the cost per play in AYA using the exact same logic as calculatePlayAttemptsCost
    
    // Step 1: Apply NFT discount to base SUI cost if applicable
    const discountedBaseCost = isNFTVerified ? baseCostPerPlay * 0.5 : baseCostPerPlay;
    console.log("Discounted base cost (SUI MIST):", discountedBaseCost);
    
    // Step 2: Convert SUI from MIST to base units
    const suiBaseAmount = discountedBaseCost / 1_000_000_000;
    console.log("SUI base amount:", suiBaseAmount);
    
    // Step 3: Calculate equivalent AYA amount based on price ratio
    let ayaAmount;
    if (tokenPrices.SUI && tokenPrices.AYA) {
      ayaAmount = suiBaseAmount * tokenPrices.SUI / tokenPrices.AYA;
      console.log("AYA amount using price ratio:", {
        suiPrice: tokenPrices.SUI,
        ayaPrice: tokenPrices.AYA,
        ratio: tokenPrices.SUI / tokenPrices.AYA,
        ayaAmount
      });
    } else {
      // If prices aren't available, use a conservative estimate or default to a small value
      if (!tokenPrices.SUI || !tokenPrices.AYA) {
        console.log("Token prices not available, defaulting to minimal max attempts");
        return 1; // Return minimal play attempts if we can't calculate
      }
      ayaAmount = suiBaseAmount * 550000; // Current ratio is about 550,000:1
      console.log("AYA amount using fallback:", ayaAmount);
    }
    
    // Step 4: Apply the 25% AYA discount
    const discountedAyaAmount = ayaAmount * 0.75;
    console.log("Discounted AYA amount:", discountedAyaAmount);
    
    // Step 5: Convert to AYA base units (AYA has 6 decimals)
    const ayaCostPerPlay = Math.floor(discountedAyaAmount * 1_000_000);
    console.log("AYA cost per play in base units:", ayaCostPerPlay);
    
    // Step 6: Divide AYA balance by AYA cost per play
    // Note: AYA balance is in AYA base units (with 6 decimals)
    if (ayaCostPerPlay <= 0) {
      console.log("Invalid cost per play (≤0), returning minimal attempts");
      return 1;
    }
    
    const maxAttempts = Math.floor(balanceToUse / ayaCostPerPlay);
    console.log("Max attempts calculation:", {
      ayaBalance: balanceToUse,
      ayaCostPerPlay,
      maxAttempts
    });
    
    // Return the lesser of maxAttempts or 1000, but at least a minimum value
    const finalMaxAttempts = Math.min(1000, Math.max(1, maxAttempts));
    console.log("Final max attempts:", finalMaxAttempts);
    
    return finalMaxAttempts;
  } else {
    // For SUI payments
    // Apply NFT discount if applicable
    const discountedCost = isNFTVerified ? baseCostPerPlay * 0.5 : baseCostPerPlay;
    
    // Calculate max attempts - both balance and cost are in MIST
    const maxAttempts = Math.floor(balanceToUse / discountedCost);
    
    console.log("SUI payment calculation:", {
      baseCost: baseCostPerPlay,
      discountedCost,
      suiBalance: balanceToUse,
      maxAttempts
    });
    
    return Math.min(1000, Math.max(1, maxAttempts));
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
  const result = calculatePlayAttemptsCost(plays, isNFTVerified, isAyaPayment);
  
  // Original cost without discounts (in SUI MIST)
  const originalCost = (400000000 * plays).toString();
  const originalFormattedSui = formatMistToSui(originalCost);
  
  // Format based on the token
  if (isAyaPayment) {
    // For AYA, result is an object with totalCost and distribution
    const totalCostMist = result.totalCost;
    
    // Format for display (divide by 10^6)
    const formattedAya = (Number(totalCostMist) / 1_000_000).toFixed(2);
    
    // Calculate discount percentage
    let discountPercentage = 25; // Base AYA discount
    if (isNFTVerified) discountPercentage += 37.5; // 50% of remaining after AYA discount
    
    return {
      // Include both the total cost and the distribution for use in the transaction
      totalCostMist: totalCostMist,
      // Pass through the distribution values exactly as they are - do not recalculate
      distribution: result.distribution,
      totalCostSui: formattedAya, // Formatted AYA for display
      originalCostSui: originalFormattedSui, // Original SUI amount for comparison
      discountPercentage,
      discountApplied: true,
      plays,
      token: 'AYA',
      isAyaPayment: true
    };
  } else {
    // For SUI payments, result is a string
    const totalCostMist = result;
    const formattedSui = formatMistToSui(totalCostMist);
    
    // Calculate discount percentage
    const discountPercentage = isNFTVerified ? 50 : 0;
    
    return {
      totalCostMist: totalCostMist,
      totalCostSui: formattedSui, // Formatted SUI for display
      originalCostSui: originalFormattedSui,
      discountPercentage,
      discountApplied: discountPercentage > 0,
      plays,
      token: 'SUI',
      isAyaPayment: false
    };
  }
}; 