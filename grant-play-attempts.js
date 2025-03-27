/**
 * Script to grant play attempts to a specific wallet
 * Run with: node grant-play-attempts.js <wallet_address> <quantity>
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Set up paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '.env.development') });

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:6969';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-key-for-development';

async function grantPlayAttempts(playerWallet, quantity) {
  console.log(`Granting ${quantity} play attempts to wallet: ${playerWallet}`);
  console.log(`Using API at: ${API_BASE_URL}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/plays/grant`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_API_KEY}`
      },
      body: JSON.stringify({
        playerWallet,
        quantity: parseInt(quantity, 10),
        grantReason: 'Admin grant via script'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to grant play attempts: ${response.status} - ${errorData}`);
    }
    
    const result = await response.json();
    console.log('Success!');
    console.log('Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error granting play attempts:', error);
    throw error;
  }
}

// Get wallet address and quantity from command line arguments
const walletAddress = process.argv[2] || '0x2f67ea6bebf0b7b184daaab106c1ca942339b52c302a1a1ac181f0733b8c64bb';
const quantity = process.argv[3] || 10;

// Validate input
if (!walletAddress || !walletAddress.startsWith('0x')) {
  console.error('Error: Please provide a valid wallet address starting with 0x');
  process.exit(1);
}

if (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0) {
  console.error('Error: Quantity must be a positive number');
  process.exit(1);
}

// Run the grant function
grantPlayAttempts(walletAddress, quantity)
  .then(() => {
    console.log('Operation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Operation failed:', error);
    process.exit(1);
  }); 