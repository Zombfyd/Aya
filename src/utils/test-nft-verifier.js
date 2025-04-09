/**
 * Test script for NFTVerifier
 * 
 * Run with: node src/utils/test-nft-verifier.js
 */

import NFTVerifier from './NFTVerifier.js';

// Test wallet address
const TEST_WALLET = '0x2f67ea6bebf0b7b184daaab106c1ca942339b52c302a1a1ac181f0733b8c64bb';

async function runTest() {
  console.log('Testing NFTVerifier module...');
  console.log('NFTVerifier object:', NFTVerifier);
  console.log('Available methods:', Object.keys(NFTVerifier));
  
  try {
    console.log(`Checking NFTs for wallet: ${TEST_WALLET}`);
    const result = await NFTVerifier.checkUserNFTs(TEST_WALLET, true);
    
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`Found ${result.verifiedNFTs.length} verified NFTs`);
    console.log(`Verified: ${result.isNFTVerified}`);
    console.log(`Active collections: ${result.activeCollections.length}`);
    
    return result;
  } catch (error) {
    console.error('Error testing NFTVerifier:', error);
    return null;
  }
}

// Run the test
runTest().then(result => {
  console.log('Test completed.');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 