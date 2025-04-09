/**
 * NFT Verifier Module
 * 
 * This module provides functions to verify a wallet's NFTs against active collections.
 * It uses the Indexer API and the ayagame.onrender.com server to fetch and verify NFTs.
 */

import axios from 'axios';

// Constants with environment variables
const INDEXER_API_ENDPOINT = import.meta.env.VITE_INDEXER_API_URL;
const INDEXER_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-user': import.meta.env.VITE_INDEXER_API_USER,
  'x-api-key': import.meta.env.VITE_INDEXER_API_KEY
};
const AYA_API_ENDPOINT = import.meta.env.VITE_APP_API_URL;

// Cache implementation
class NFTCache {
  constructor() {
    this.collections = {
      data: null,
      lastFetched: 0,
      ttl: 24 * 60 * 60 * 1000 // 24 hours TTL for collections
    };
    this.walletNFTs = {};
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL for NFTs
  }

  getCollections() {
    const now = Date.now();
    if (this.collections.data && (now - this.collections.lastFetched < this.collections.ttl)) {
      console.log(`Using ${this.collections.data.length} cached active collections`);
      return this.collections.data;
    }
    return null;
  }

  setCollections(data) {
    this.collections.data = data;
    this.collections.lastFetched = Date.now();
    console.log(`Cached ${data.length} active collections`);
  }

  getWalletNFTs(walletAddress) {
    if (walletAddress in this.walletNFTs) {
      const cachedData = this.walletNFTs[walletAddress];
      const now = Date.now();
      if (now - cachedData.timestamp < this.ttl) {
        console.log(`Using cached NFTs for wallet ${walletAddress}`);
        return cachedData.data;
      }
    }
    return null;
  }

  setWalletNFTs(walletAddress, data) {
    this.walletNFTs[walletAddress] = {
      data: data,
      timestamp: Date.now()
    };
    console.log(`Cached NFTs for wallet ${walletAddress}`);
  }

  clearCollections() {
    this.collections.data = null;
    console.log("Cleared collections cache");
  }

  clearAll() {
    this.clearCollections();
    this.walletNFTs = {};
    console.log("Cleared all caches");
  }
}

// Initialize cache
const nftCache = new NFTCache();

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(a, b) {
  if (!a || !b) return 0;
  
  // Convert to lowercase for case-insensitive comparison
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  
  // Calculate Levenshtein distance
  const track = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  // Convert distance to similarity ratio
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength === 0 ? 1 : 1 - (track[s2.length][s1.length] / maxLength);
}

/**
 * Create an axios client with retry capability
 */
function createAxiosClient() {
  const client = axios.create({
    timeout: 10000
  });
  
  // Add response interceptor for retries
  client.interceptors.response.use(null, async (error) => {
    const { config } = error;
    
    // Only retry on network errors or 5xx errors
    if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        const delay = config.__retryCount * 1000;
        console.log(`Retrying request (${config.__retryCount}/3) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(config);
      }
    }
    
    return Promise.reject(error);
  });
  
  return client;
}

/**
 * Verify NFTs against active collections
 */
function verifyNFTs(nfts, activeCollections) {
  const verifiedNFTs = [];
  
  for (const nft of nfts) {
    console.log("\nNFT Details:");
    console.log(`- Token ID: ${nft.token_id || 'Unknown'}`);
    console.log(`- Name: ${nft.name || 'Unknown'}`);
    console.log(`- Collection ID: ${nft.collection_id || 'Unknown'}`);
    console.log(`- Media URL: ${nft.media_url || ''}`);
    console.log(`- NFT Type/Package: ${nft.type || 'Unknown'}`);

    let matched = false;
    for (const collection of activeCollections) {
      console.log(`\nComparing against collection: ${collection.name}`);
      console.log(`  - Collection type: ${collection.collectionType}`);
      console.log(`  - NFT type: ${nft.type || ''}`);
      
      // Extract collection name without spaces and lowercase
      const collectionNameNormalized = collection.name.toLowerCase().replace(/\s+/g, '');
      const nftNameNormalized = (nft.name || '').toLowerCase().replace(/\s+/g, '');
      
      // Check if NFT name contains collection name or vice versa
      let nameMatch = collectionNameNormalized.includes(nftNameNormalized) || 
                     nftNameNormalized.includes(collectionNameNormalized);
      
      // Check for fuzzy match if exact match fails
      if (!nameMatch) {
        const similarity = calculateSimilarity(collectionNameNormalized, nftNameNormalized);
        if (similarity > 0.8) {  // 80% similarity threshold
          console.log(`  - Similarity score: ${similarity.toFixed(2)}`);
          nameMatch = true;
        }
      }
      
      // Extract package IDs
      const collectionPackage = collection.collectionType.split('::')[0].replace('0x', '').toLowerCase();
      const nftPackage = (nft.type || '').replace('0x', '').toLowerCase();
      
      console.log(`  - Collection package: ${collectionPackage}`);
      console.log(`  - NFT package: ${nftPackage}`);
      
      // Check for matches
      if (nameMatch || collectionPackage === nftPackage) {
        const matchType = nameMatch ? 'name' : 'package';
        console.log(`  ✓ ${matchType.charAt(0).toUpperCase() + matchType.slice(1)} match!`);
        matched = true;
        verifiedNFTs.push({
          nft: nft,
          collection: collection,
          match_type: matchType
        });
        break;
      } else {
        console.log("  × No match");
      }
    }
  }
  
  console.log(`\nFound ${verifiedNFTs.length} verified NFTs from active collections`);
  return verifiedNFTs;
}

/**
 * Fetch active collections from the local server
 */
async function fetchActiveCollections() {
  // Check cache first
  const cachedCollections = nftCache.getCollections();
  if (cachedCollections) {
    return cachedCollections;
  }
  
  try {
    // Use the API endpoint from environment variables
    const url = `${AYA_API_ENDPOINT}/sui/collections/active`;
    console.log(`Attempting to fetch collections from ${url}`);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    const collections = response.data;
    console.log(`Found ${collections.length} collections`);
    
    // Cache the collections
    nftCache.setCollections(collections);
    
    return collections;
  } catch (error) {
    console.error(`Error fetching collections: ${error}`);
    return [];
  }
}

/**
 * Fetch NFTs owned by a specific wallet
 */
async function fetchWalletNFTs(walletAddress) {
  // Check cache first
  const cachedNFTs = nftCache.getWalletNFTs(walletAddress);
  if (cachedNFTs) {
    return cachedNFTs;
  }
  
  try {
    // Create an axios client with retry capability
    const client = createAxiosClient();
    
    // Get all NFTs owned by the wallet using wallet_holdings
    const query = `
      query GetWalletNFTs($walletAddress: String!) {
        sui {
          wallet_holdings(
            address: $walletAddress
          ) {
            nft {
              token_id
              collection_id
              media_url
              name
            }
          }
        }
      }
    `;

    console.log(`Fetching NFTs for wallet ${walletAddress}`);
    const response = await client.post(
      INDEXER_API_ENDPOINT,
      {
        query: query,
        variables: {
          walletAddress: walletAddress
        }
      },
      { 
        headers: INDEXER_HEADERS,
        timeout: 10000
      }
    );

    const result = response.data;
    
    if (!result || !result.data || !result.data.sui || !result.data.sui.wallet_holdings) {
      console.error("Error fetching wallet NFTs: Invalid response format");
      return [];
    }
    
    const walletHoldings = result.data.sui.wallet_holdings;
    console.log(`Found ${walletHoldings.length} NFTs in wallet ${walletAddress}`);

    // Helper function to format IPFS URLs
    const formatUrl = (url) => {
      if (!url) return '';
      
      // If it's already a full URL that's not IPFS, return it
      if (url.startsWith('http') && !url.includes('ipfs')) {
        return url;
      }
      
      // Extract CID from various IPFS URL formats
      let cid = url;
      
      if (url.startsWith('ipfs://')) {
        cid = url.replace('ipfs://', '');
      } else if (url.includes('ipfs.io/ipfs/')) {
        cid = url.split('ipfs.io/ipfs/')[1];
      } else if (url.includes('/ipfs/')) {
        cid = url.split('/ipfs/')[1];
      }
      
      // Return URL from public gateway
      return `https://ipfs.io/ipfs/${cid}`;
    };

    // Format wallet NFTs
    const formattedWalletNFTs = walletHoldings
      .filter(holding => holding.nft)
      .map(holding => {
        const nft = holding.nft;
        const formattedMediaUrl = formatUrl(nft.media_url);
        
        // Use token_id as the type since it contains the package ID
        return {
          token_id: nft.token_id,
          collection_id: nft.collection_id,
          name: nft.name || 'Unknown NFT',
          media_url: formattedMediaUrl,
          type: nft.token_id || '',  // Use token_id as the type
          image_url: formattedMediaUrl // Add image_url for UI display
        };
      });

    console.log(`Found ${formattedWalletNFTs.length} total NFTs in wallet`);
    
    // Cache the results
    nftCache.setWalletNFTs(walletAddress, formattedWalletNFTs);
    
    return formattedWalletNFTs;
  } catch (error) {
    console.error(`Error fetching wallet NFTs: ${error}`);
    return [];
  }
}

/**
 * Main function to check user NFTs against active collections
 */
export async function checkUserNFTs(walletAddress, forceRefresh = false) {
  console.log(`=== CHECKING USER NFTS FOR ${walletAddress} ===`);
  
  if (!walletAddress) {
    console.log("No wallet address provided");
    return { verifiedNFTs: [], isNFTVerified: false, activeCollections: [] };
  }
  
  // If force refresh is requested, clear the cache for this wallet
  if (forceRefresh && walletAddress in nftCache.walletNFTs) {
    delete nftCache.walletNFTs[walletAddress];
    console.log(`Cleared cache for wallet ${walletAddress} due to force refresh`);
  }
  
  try {
    // First get all NFTs owned by the wallet
    console.log("Fetching all NFTs owned by wallet...");
    const walletNFTs = await fetchWalletNFTs(walletAddress);
    console.log(`Found ${walletNFTs.length} total NFTs owned by wallet`);
    
    // Fetch active collections
    const activeCollections = await fetchActiveCollections();
    console.log(`Checking against ${activeCollections.length} active collections`);
    
    // Verify NFTs against active collections
    const verifiedNFTs = verifyNFTs(walletNFTs, activeCollections);
    
    // Format the results for UI display
    const formattedVerifiedNFTs = verifiedNFTs.map(item => {
      // Ensure we have all required fields with proper fallbacks
      return {
        ...item.nft,
        token_id: item.nft.token_id || 'unknown',
        collection: item.collection,
        collectionName: item.collection.name,
        collectionType: item.collection.collectionType,
        discountPercentage: item.collection.discount,
        verified: true,
        match_type: item.match_type,
        // Ensure required UI display fields exist
        name: item.nft.name || item.collection.name || 'Unnamed NFT',
        media_url: item.nft.media_url || '/placeholder.png',
        image_url: item.nft.image_url || item.nft.media_url || '/placeholder.png',
        in_kiosk: item.nft.in_kiosk || false,
        // Add collection-specific info
        collectionId: item.collection.collectionType ? item.collection.collectionType.split('::')[0] : null
      };
    });
    
    console.log(`Found ${formattedVerifiedNFTs.length} verified NFTs from active collections`);
    console.log('Formatted verified NFTs:', formattedVerifiedNFTs);
    
    return {
      verifiedNFTs: formattedVerifiedNFTs,
      isNFTVerified: formattedVerifiedNFTs.length > 0,
      activeCollections: activeCollections
    };
  } catch (error) {
    console.error(`Error checking user NFTs: ${error}`);
    return { verifiedNFTs: [], isNFTVerified: false, activeCollections: [] };
  }
}

/**
 * Clear all NFT caches
 */
export function clearAllNFTCaches() {
  nftCache.clearAll();
}

/**
 * Clear NFT cache for a specific wallet
 */
export function clearNFTCacheForWallet(address) {
  if (address in nftCache.walletNFTs) {
    delete nftCache.walletNFTs[address];
    console.log(`Cleared cache for wallet ${address}`);
  }
}

export default {
  checkUserNFTs,
  clearAllNFTCaches,
  clearNFTCacheForWallet
}; 