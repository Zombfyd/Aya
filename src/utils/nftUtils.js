// NFT Utilities for Aya platform
import config from '../config/config';

// Define AYA_API_ROOT since it's being imported but doesn't exist
const AYA_API_ROOT = config.apiBaseUrl;

// Cache for NFT data to avoid excessive API calls
const nftCache = {
  collections: {
    data: null,
    lastFetched: 0,
    ttl: 24 * 60 * 60 * 1000 // 24 hours TTL for collections (will be manually cleared on page load/refresh)
  },
  wallets: {}, // Will store wallet-specific NFT data
  ttl: 10 * 60 * 1000, // 10 minutes TTL for wallet NFTs
  
  // Helper to get cached collections
  getCollections: function() {
    const now = Date.now();
    if (this.collections.data && (now - this.collections.lastFetched < this.collections.ttl)) {
      return this.collections.data;
    }
    return null;
  },
  
  // Helper to set cached collections
  setCollections: function(data) {
    this.collections.data = data;
    this.collections.lastFetched = Date.now();
  },
  
  // Helper to get cached wallet NFTs
  getWalletNFTs: function(address) {
    if (!address) return null;
    
    const now = Date.now();
    const walletCache = this.wallets[address];
    
    if (walletCache && (now - walletCache.lastFetched < this.ttl)) {
      logger.log(`Using cached NFTs for wallet ${address.slice(0, 8)}...`);
      return walletCache.data;
    }
    
    return null;
  },
  
  // Helper to set cached wallet NFTs
  setWalletNFTs: function(address, data) {
    if (!address) return;
    
    this.wallets[address] = {
      data: data,
      lastFetched: Date.now()
    };
    
    logger.log(`Cached NFTs for wallet ${address.slice(0, 8)}...`);
  },
  
  // Clear a specific wallet's cache
  clearWalletCache: function(address) {
    if (address && this.wallets[address]) {
      delete this.wallets[address];
      logger.log(`Cleared cache for wallet ${address.slice(0, 8)}...`);
    }
  },
  
  // Clear all caches
  clearAllCaches: function() {
    this.collections.data = null;
    this.collections.lastFetched = 0;
    this.wallets = {};
    logger.log('Cleared all NFT caches');
  }
};

// Simple logger function that can be replaced with a more robust logging system
const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(...args);
    }
  }
};

/**
 * Formats IPFS URLs to use HTTP gateway
 * @param {string} url - The URL to format
 * @returns {string|null} - The formatted URL
 */
export const formatIPFSUrl = (url) => {
  if (!url) return null;
  
  // Check if it's an IPFS hash (either ipfs:// or starts with Qm or bafy)
  if (url.startsWith('ipfs://')) {
    // Remove ipfs:// prefix and ensure no leading slash
    const hash = url.replace('ipfs://', '').replace(/^\/+/, '');
    return `https://ipfs.io/ipfs/${hash}`;
  } else if (url.match(/^(Qm|bafy)/i)) {
    // Direct hash, just prepend gateway
    return `https://ipfs.io/ipfs/${url}`;
  }
  return url;
};

/**
 * Get details for a specific NFT
 * @param {Object} client - SUI client
 * @param {string} objectId - The object ID of the NFT
 * @returns {Promise<Object|null>} - The NFT details or null
 */
export const getNFTDetails = async (client, objectId) => {
  logger.log(`=== GETTING NFT DETAILS FOR ${objectId} ===`);
  try {
    const response = await client.getObject({
      id: objectId,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
        showOwner: true,
        showPreviousTransaction: true
      }
    });
    logger.log('NFT details:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    logger.error('Error getting NFT details:', error);
    return null;
  }
};

/**
 * Query ChillCats NFTs owned by a specific address
 * @param {Object} client - SUI client
 * @param {string} address - The wallet address
 * @returns {Promise<Object|null>} - The query response or null
 */
export const queryChillCatsNFTs = async (client, address) => {
  logger.log('=== QUERYING CHILLCATS NFTS ===');
  try {
    const response = await client.getOwnedObjects({
      owner: address,
      filter: {
        MatchAll: [{
          StructType: "0x3706895940d5a19a93f8656c0bd506ce7b5999d8e9af292d4fe1cd5ae0c2a279::chillcats_collection::ChillCats"
        }]
      },
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
        showOwner: true
      }
    });
    logger.log('ChillCats query response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    logger.error('Error querying ChillCats:', error);
    return null;
  }
};

/**
 * Check for any NFTs in a specific collection owned by a wallet address
 * @param {Object} client - SUI client
 * @param {string} address - The wallet address
 * @param {Object} collection - Collection information
 * @returns {Promise<Array>} - Array of verified NFTs
 */
export const checkCollectionNFTs = async (client, address, collection) => {
  logger.log(`Checking collection: ${collection.collectionType}`);
  const verifiedNFTs = [];
  
  // Get collection info from blockchain
  try {
    const collectionInfo = await client.getObject({
      id: collection.collectionType,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true
      }
    });
    
    if (collectionInfo?.data?.display?.data) {
      collection.name = collectionInfo.data.display.data.name || collection.name;
      collection.description = collectionInfo.data.display.data.description;
      collection.project_url = collectionInfo.data.display.data.project_url;
    }
  } catch (error) {
    logger.error('Error fetching collection info:', error);
  }
  
  try {
    const { data: collectionNFTs } = await client.getOwnedObjects({
      owner: address,
      filter: {
        MatchAll: [{
          StructType: collection.collectionType
        }]
      },
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
        showOwner: true
      }
    });

    logger.log(`Found ${collectionNFTs?.length || 0} NFTs for collection ${collection.name}`);

    if (collectionNFTs?.length > 0) {
      for (const nft of collectionNFTs) {
        const nftData = nft.data?.content?.fields || {};
        const displayData = nft.data?.display?.data || {};
        
        let imageUrl = displayData.image_url || nftData.url || nftData.image_url || nftData.media_url || nftData.project_url;
        if (imageUrl) {
          imageUrl = formatIPFSUrl(imageUrl);
        }

        const verifiedNFT = {
          ...collection,
          verified: true,
          name: displayData.name || nftData.name || collection.name,
          description: displayData.description || nftData.description || collection.description,
          image_url: imageUrl,
          project_url: displayData.project_url || nftData.project_url || collection.project_url,
          object_id: nft.data?.objectId || ''
        };
        logger.log('Verified NFT:', verifiedNFT);
        verifiedNFTs.push(verifiedNFT);
      }
    }
    
    return verifiedNFTs;
  } catch (error) {
    logger.error(`Error checking NFTs for collection ${collection.name}:`, error);
    return [];
  }
};

/**
 * Fetch active collections from the API
 * @returns {Promise<Array>} - Array of active collections
 */
export const fetchActiveCollections = async () => {
  logger.log('=== FETCHING ACTIVE COLLECTIONS ===');
  
  // Check cache first
  const cachedCollections = nftCache.getCollections();
  if (cachedCollections) {
    logger.log(`Using ${cachedCollections.length} cached active collections`);
    return cachedCollections;
  }
  
  try {
    // Fetch collections from API - using the correct endpoint
    const response = await fetch(`${AYA_API_ROOT}/api/sui/collections/active`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const collections = await response.json();
    logger.log(`Fetched ${collections.length} collections from API`);
    
    // Process collections to include relevant data
    const processedCollections = collections.map(collection => ({
      name: collection.name,
      type: collection.type || collection.collectionType, // Handle both potential field names
      packageId: (collection.type || collection.collectionType) ? (collection.type || collection.collectionType).split('::')[0] : null
    }));
    
    // Filter out collections without a type
    const allCollections = processedCollections.filter(collection => !!collection.type);
    
    logger.log(`Processed ${allCollections.length} valid collections with type information`);
    
    // Cache the collections
    nftCache.setCollections(allCollections);
    
    return allCollections;
  } catch (error) {
    logger.error('Error fetching active collections:', error);
    
    // Return empty array if fetch fails - no hardcoded fallbacks
    logger.log('No collections available due to API fetch error');
    return [];
  }
};

/**
 * Match kiosk items against active collections and format them like verified NFTs
 * @param {Array} kioskItems - Array of kiosk items 
 * @param {Array} activeCollections - Array of active collections
 * @returns {Array} - Array of matching kiosk items formatted as verified NFTs
 */
export const matchKioskItemsToCollections = (kioskItems, activeCollections) => {
  if (!kioskItems || !kioskItems.length || !activeCollections || !activeCollections.length) {
    return [];
  }
  
  logger.log(`Matching ${kioskItems.length} kiosk items to ${activeCollections.length} active collections`);
  
  const matchedItems = [];
  
  for (const item of kioskItems) {
    // Extract package ID from item type for more flexible matching
    const itemPackageId = item.type ? item.type.split('::')[0] : null;
    const itemType = item.type ? item.type.toLowerCase() : '';
    
    // First try exact type matching
    const typeMatch = activeCollections.find(collection => 
      collection.type === item.type
    );
    
    if (typeMatch) {
      logger.log(`Found exact type match for ${item.name || 'unnamed item'} (${item.objectId})`);
      
      // Use collection data to augment item data
      const matchedItem = {
        ...item,
        name: item.name || typeMatch.name || 'Unnamed Item',
        verified: true,
        matchType: 'exact_type'
      };
      
      matchedItems.push(matchedItem);
      continue;
    }
    
    // If no exact match, try package ID matching
    if (itemPackageId) {
      const packageMatch = activeCollections.find(collection => 
        collection.type && collection.type.split('::')[0] === itemPackageId
      );
      
      if (packageMatch) {
        logger.log(`Found package match for ${item.name || 'unnamed item'} (${item.objectId})`);
        
        // Use collection data to augment item data
        const matchedItem = {
          ...item,
          name: item.name || packageMatch.name || 'Unnamed Item',
          verified: true,
          matchType: 'package_id'
        };
        
        matchedItems.push(matchedItem);
        continue;
      }
    }
    
    // Special case for Aya Pass
    if (item.objectId === '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690' ||
        (item.type && item.type.includes('0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690'))) {
      logger.log(`Found special item match for Aya Pass (${item.objectId})`);
      
      const matchedItem = {
        ...item,
        name: 'Aya Pass',
        verified: true,
        matchType: 'special_item'
      };
      
      matchedItems.push(matchedItem);
      continue;
    }
  }
  
  logger.log(`Matched ${matchedItems.length} kiosk items to active collections`);
  return matchedItems;
};

/**
 * Check all NFTs owned by a user across active collections
 * @param {Object} client - SUI client
 * @param {Object} wallet - User's wallet
 * @returns {Promise<{verifiedNFTs: Array, isNFTVerified: boolean, activeCollections: Array}>} - Results of NFT check
 */
export const checkUserNFTs = async (client, wallet) => {
  logger.log('=== USER NFT VERIFICATION ===');
  if (!wallet.connected) {
    logger.log('Wallet not connected, skipping NFT check');
    return { verifiedNFTs: [], isNFTVerified: false, activeCollections: [] };
  }

  try {
    // Get active collections from database
    const activeCollections = await fetchActiveCollections();
    
    const verifiedNFTs = [];

    // Process each collection type separately to ensure proper filtering
    for (const collection of activeCollections) {
      const collectionNFTs = await checkCollectionNFTs(client, wallet.account.address, collection);
      verifiedNFTs.push(...collectionNFTs);
    }
    
    logger.log('\nFinal verification results:', {
      verifiedNFTs: verifiedNFTs.length,
      verifiedList: verifiedNFTs
    });
    
    return {
      verifiedNFTs,
      isNFTVerified: verifiedNFTs.length > 0,
      activeCollections
    };
  } catch (error) {
    logger.error('Error checking NFTs:', error);
    return { verifiedNFTs: [], isNFTVerified: false, activeCollections: [] };
  }
};

/**
 * Enhanced version of checkUserNFTs that also checks kiosk items
 * @param {Object} client - SUI client
 * @param {Object} wallet - User's wallet
 * @param {boolean} forceRefresh - Whether to force a refresh and bypass cache
 * @returns {Promise<{verifiedNFTs: Array, isNFTVerified: boolean, activeCollections: Array}>} - Results of NFT check
 */
export const checkUserNFTsAndKiosk = async (client, wallet, forceRefresh = false) => {
  console.log('Checking NFTs for wallet:', wallet.account?.address);
  
  if (!wallet || !wallet.account) {
    console.log('No wallet connected');
    return { verified: false, nfts: [] };
  }
  
  // Check cache first unless forceRefresh is true
  if (!forceRefresh) {
    const cachedResult = nftCache.getWalletNFTs(wallet.account.address);
    if (cachedResult) {
      return cachedResult;
    }
  } else {
    console.log('Forced refresh of NFTs, bypassing cache');
  }
  
  try {
    // Fetch active collections
    const activeCollections = await fetchActiveCollections();
    console.log(`Fetched ${activeCollections.length} active collections`);
    
    // Log all collection types for debugging
    console.log('Active collection types:');
    activeCollections.forEach(collection => {
      const collectionType = collection.type || collection.collectionType;
      console.log(`- ${collectionType} (${collection.name})`);
    });
    
    // APPROACH 1: Use the Blockberry API to get NFTs (new method)
    const blockberryResults = await fetchBlockberryNFTs(wallet.account.address, activeCollections);
    console.log(`Blockberry API matched ${blockberryResults.nfts.length} direct NFTs and ${blockberryResults.kioskNfts.length} kiosk NFTs from active collections`);
    
    // Log any discrepancies between all NFTs and matched NFTs
    if (blockberryResults.allDirectNfts.length > blockberryResults.nfts.length) {
      console.log(`Note: ${blockberryResults.allDirectNfts.length - blockberryResults.nfts.length} direct NFTs from Blockberry API were not matched to active collections`);
    }
    
    if (blockberryResults.allKioskNfts.length > blockberryResults.kioskNfts.length) {
      console.log(`Note: ${blockberryResults.allKioskNfts.length - blockberryResults.kioskNfts.length} kiosk NFTs from Blockberry API were not matched to active collections`);
    }
    
    // APPROACH 2: Use our original SUI SDK method as a fallback
    // Use pagination to get ALL owned objects
    let allWalletObjects = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;
    let totalFetched = 0;
    
    while (hasNextPage) {
      pageCount++;
      console.log(`Fetching page ${pageCount} of owned objects (cursor: ${cursor || 'null'})`);
      
      const response = await client.getOwnedObjects({
        owner: wallet.account.address,
        cursor,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
          showOwner: true,
        },
        // Explicitly request 50 items per page (maximum allowed by SUI API)
        limit: 50
      });
      
      if (!response || !response.data || !response.data.length) {
        console.log(`No more objects found on page ${pageCount}`);
        hasNextPage = false;
        break;
      }
      
      const pageObjects = response.data;
      allWalletObjects = [...allWalletObjects, ...pageObjects];
      totalFetched += pageObjects.length;
      console.log(`Added ${pageObjects.length} objects from page ${pageCount}, total: ${totalFetched}`);
      
      // Check for next page
      cursor = response.nextCursor;
      hasNextPage = !!cursor && response.hasNextPage;
    }
    
    console.log(`Total owned objects fetched: ${allWalletObjects.length}`);
    
    // Find direct NFT matches from allWalletObjects
    const exactMatches = [];
    const packageMatches = [];
    
    // Keep track of distinct object types for debugging
    const distinctTypes = new Set();
    
    // Special case: look for Aya Pass type
    const AYA_PASS_TYPE = '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690::everyone_will_cry__::Nft';
    let foundAyaPass = false;
    
    // Process all objects to find matching NFTs
    allWalletObjects.forEach(obj => {
      if (!obj.data || !obj.data.content) return;
      
      const objectData = obj.data;
      const objectType = objectData.type;
      
      // Keep track of all object types for debugging
      if (objectType) {
        distinctTypes.add(objectType);
        
        // Check specifically for Aya Pass
        if (objectType.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())) {
          console.log('📢 Found Aya Pass in direct wallet objects!', obj.data.objectId);
          foundAyaPass = true;
        }
      }
      
      // Look for exact matches with active collections
      let matched = false;
      
      for (const collection of activeCollections) {
        const collectionType = collection.type || collection.collectionType;
        
        if (!collectionType || !objectType) continue;
        
        // EXACT MATCH: Object type exactly matches collection type
        if (objectType.toLowerCase() === collectionType.toLowerCase()) {
          console.log(`Found exact match: ${objectType}`);
          exactMatches.push({
            ...createNFTObject(objectData, collection),
            match_type: 'exact'
          });
          matched = true;
          break;
        }
        
        // PACKAGE MATCH: Object comes from the same package as a collection
        const objPackage = objectType.split('::')[0];
        const collPackage = collectionType.split('::')[0];
        
        if (objPackage && collPackage && objPackage === collPackage) {
          console.log(`Found package match: ${objectType} (package: ${objPackage})`);
          packageMatches.push({
            ...createNFTObject(objectData, collection),
            match_type: 'package'
          });
          matched = true;
          break;
        }
      }
      
      // If not matched to a collection but looks like an NFT
      if (!matched && isObjectLikelyNFT(objectData)) {
        console.log(`Found likely NFT but it doesn't match active collections: ${objectType}`);
        // Don't add to genericMatches since we only want matches from active collections
      }
    });
    
    // Log all distinct types found for debugging
    console.log(`Found ${distinctTypes.size} distinct object types`);
    console.log('Aya Pass found in direct wallet objects?', foundAyaPass);
    
    // PART 3: Check for NFTs in user kiosks
    const userKiosks = await findUserKiosks(client, wallet.account.address);
    console.log(`Found ${userKiosks.length} kiosks for user`);
    
    let allKioskItems = [];
    let kioskMatchedNFTs = [];
    
    // Process each kiosk
    for (const kiosk of userKiosks) {
      try {
        // Skip if kiosk doesn't have a valid ID
        if (!kiosk || !kiosk.id) {
          console.log('Skipping kiosk with invalid or missing ID');
          continue;
        }
        
        // Get all items in this kiosk
        const kioskItems = await getKioskItems(client, kiosk.id);
        console.log(`Kiosk ${kiosk.id.slice(0, 8)}... has ${kioskItems.length} items`);
        allKioskItems = [...allKioskItems, ...kioskItems];
        
        // Check if any items match our active collections
        const matchedItems = matchKioskItemsToCollections(kioskItems, activeCollections);
        console.log(`Found ${matchedItems.length} matching NFTs in kiosk ${kiosk.id.slice(0, 8)}...`);
        
        // Add kiosk info to matched items
        const kioskNFTs = matchedItems.map(item => ({
          ...item,
          in_kiosk: true,
          kiosk_id: kiosk.id
        }));
        
        kioskMatchedNFTs = [...kioskMatchedNFTs, ...kioskNFTs];
        
        // Check specifically for Aya Pass in this kiosk
        const ayaPassInKiosk = kioskItems.some(item => 
          item.type && item.type.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())
        );
        
        if (ayaPassInKiosk) {
          console.log(`📣 Found Aya Pass in kiosk ${kiosk.id.slice(0, 8)}...`);
        }
      } catch (error) {
        console.error(`Error processing kiosk ${kiosk?.id || 'unknown'}:`, error);
      }
    }
    
    // PART 4: Combine results from all sources
    // Start with Blockberry API results (which are already matched against active collections)
    let allMatchedNFTs = [
      ...blockberryResults.nfts,
      ...blockberryResults.kioskNfts
    ];
    
    // Add results from SUI SDK method
    const directNFTs = [
      ...exactMatches,
      ...packageMatches
    ];
    
    console.log(`Excluding ${directNFTs.length} direct NFTs that don't match active collections`);
    
    // Merge results, avoiding duplicates by object ID
    const seenIds = new Set(allMatchedNFTs.map(nft => nft.id));
    
    // Add direct NFTs that aren't already included
    directNFTs.forEach(nft => {
      if (!seenIds.has(nft.id)) {
        allMatchedNFTs.push(nft);
        seenIds.add(nft.id);
      }
    });
    
    // Add kiosk NFTs that aren't already included
    kioskMatchedNFTs.forEach(nft => {
      if (!seenIds.has(nft.id)) {
        allMatchedNFTs.push(nft);
        seenIds.add(nft.id);
      }
    });
    
    console.log(`Total matched NFTs after combining all sources: ${allMatchedNFTs.length}`);
    console.log(`- From Blockberry API: ${blockberryResults.nfts.length + blockberryResults.kioskNfts.length}`);
    console.log(`- From direct wallet: ${directNFTs.length}`);
    console.log(`- From kiosks: ${kioskMatchedNFTs.length}`);
    console.log('NOTE: Only showing NFTs that match active collections from the API');
    
    // Ensure that all NFTs are proper matches to active collections
    // (Blockberry results are already filtered, the SUI SDK results are also filtered)
    
    // Log collection types of all matched NFTs for verification
    console.log('Collection types of all matched NFTs:');
    const matchedTypes = new Set();
    allMatchedNFTs.forEach(nft => {
      if (nft.type) {
        matchedTypes.add(nft.type);
      }
    });
    
    // Print out the first 10 types for debugging
    Array.from(matchedTypes).slice(0, 10).forEach(type => {
      console.log(`- ${type}`);
    });
    
    if (matchedTypes.size > 10) {
      console.log(`... and ${matchedTypes.size - 10} more types`);
    }
    
    // Final result
    const result = {
      verified: allMatchedNFTs.length > 0,
      nfts: allMatchedNFTs,
      activeCollections
    };
    
    // Cache the result
    nftCache.setWalletNFTs(wallet.account.address, result);
    
    return result;
  } catch (error) {
    console.error('Error in checkUserNFTsAndKiosk:', error);
    return { verified: false, nfts: [], activeCollections: [] };
  }
};

/**
 * Check if a user owns any specific NFT
 * @param {Object} client - SUI client
 * @param {string} address - The wallet address
 * @param {string} structType - The full struct type to check for
 * @returns {Promise<boolean>} - Whether the user owns any NFTs of this type
 */
export const checkSpecificNFTOwnership = async (client, address, structType) => {
  try {
    const { data: nfts } = await client.getOwnedObjects({
      owner: address,
      filter: {
        MatchAll: [{
          StructType: structType
        }]
      },
      options: { showType: true }
    });
    
    return nfts && nfts.length > 0;
  } catch (error) {
    logger.error(`Error checking specific NFT ownership for ${structType}:`, error);
    return false;
  }
};

/**
 * Find all kiosks owned by a wallet address
 * @param {Object} client - SUI client
 * @param {string} address - The wallet address
 * @returns {Promise<Array>} - Array of kiosk IDs
 */
export const findUserKiosks = async (client, address) => {
  logger.log(`=== FINDING KIOSKS FOR ${address} ===`);
  try {
    // Step 1: Get ALL objects owned by the user
    const { data: allObjects } = await client.getOwnedObjects({
      owner: address,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
        showOwner: true
      }
    });
    
    logger.log(`Found ${allObjects?.length || 0} total objects for address ${address}`);
    
    // Step 2: Find the actual kiosk objects (multiple approaches)
    const kioskIds = [];
    const processedIds = new Set();
    
    // Method 1: Standard kiosk types
    const standardKiosks = allObjects.filter(obj => 
      obj.data?.type && (
        obj.data.type.includes('::kiosk::Kiosk') || 
        obj.data.type.includes('::kiosk_extension::Kiosk')
      )
    );
    
    for (const kiosk of standardKiosks) {
      if (kiosk.data?.objectId && !processedIds.has(kiosk.data.objectId)) {
        processedIds.add(kiosk.data.objectId);
        kioskIds.push(kiosk.data.objectId);
      }
    }
    
    // Method 2: Find kiosks via PersonalKioskCap objects
    const kioskCaps = allObjects.filter(obj => 
      obj.data?.type && (
        obj.data.type.includes('::personal_kiosk::PersonalKioskCap') ||
        obj.data.type.includes('::kiosk::KioskOwnerCap')
      )
    );
    
    logger.log(`Found ${kioskCaps.length} kiosk capability objects`);
    
    for (const cap of kioskCaps) {
      try {
        // Extract the kiosk ID from the cap's content fields
        const kioskId = cap.data?.content?.fields?.for?.fields?.id?.id || 
                        cap.data?.content?.fields?.for?.id || 
                        cap.data?.content?.fields?.kiosk_id?.id ||
                        cap.data?.content?.fields?.kiosk_id ||
                        cap.data?.content?.fields?.kiosk?.fields?.id?.id || 
                        cap.data?.content?.fields?.kiosk?.id;
        
        if (kioskId && !processedIds.has(kioskId)) {
          logger.log(`Found kiosk ID ${kioskId} from capability object`);
          
          // Fetch the actual kiosk object
          try {
            const kioskObj = await client.getObject({
              id: kioskId,
              options: {
                showType: true,
                showContent: true,
                showDisplay: true,
                showOwner: true
              }
            });
            
            if (kioskObj?.data?.objectId) {
              processedIds.add(kioskObj.data.objectId);
              kioskIds.push(kioskObj.data.objectId);
            }
          } catch (err) {
            logger.error(`Failed to fetch kiosk object ${kioskId}:`, err);
          }
        }
      } catch (err) {
        logger.error('Error processing kiosk cap:', err);
      }
    }
    
    // Method 3: Look for objects with "kiosk" in their name
    const otherPossibleKiosks = allObjects.filter(obj => 
      !processedIds.has(obj.data?.objectId) &&
      obj.data?.type && 
      obj.data.type.toLowerCase().includes('kiosk') && 
      !obj.data.type.includes('::personal_kiosk::PersonalKioskCap') &&
      !obj.data.type.includes('::kiosk::KioskOwnerCap')
    );
    
    for (const kiosk of otherPossibleKiosks) {
      if (kiosk.data?.objectId) {
        processedIds.add(kiosk.data.objectId);
        kioskIds.push(kiosk.data.objectId);
      }
    }
    
    // Log the results
    logger.log(`Found ${kioskIds.length} kiosk IDs for address ${address}`);
    if (kioskIds.length > 0) {
      logger.log(`First few kiosk IDs: ${kioskIds.slice(0, 3).join(', ')}`);
    }
    
    return kioskIds;
  } catch (error) {
    logger.error('Error finding user kiosks:', error);
    return [];
  }
};

/**
 * Get all items inside a kiosk
 * @param {Object} client - SUI client
 * @param {string} kioskId - The kiosk object ID
 * @returns {Promise<Array>} - Array of items in the kiosk
 */
export const getKioskItems = async (client, kioskId) => {
  // Ensure kioskId is a string
  if (!kioskId || typeof kioskId !== 'string') {
    logger.error(`Invalid kioskId: ${kioskId}`);
    return [];
  }

  logger.log(`=== GETTING ITEMS FOR KIOSK ${kioskId} ===`);
  
  try {
    // Get the kiosk content using dynamic fields
    const kioskFields = await client.getDynamicFields({
      parentId: kioskId,
      limit: 50 // Ensure we get a full page of fields
    });
    
    logger.log(`Found ${kioskFields.data?.length || 0} dynamic fields in kiosk ${kioskId}`);
    
    // Check if there are more pages
    let allFields = kioskFields.data || [];
    let cursor = kioskFields.nextCursor;
    let hasNextPage = kioskFields.hasNextPage;
    let pageCount = 1;
    
    // Paginate through all fields if needed
    while (hasNextPage && cursor) {
      pageCount++;
      logger.log(`Fetching page ${pageCount} of kiosk fields (cursor: ${cursor})`);
      
      const nextPage = await client.getDynamicFields({
        parentId: kioskId,
        cursor,
        limit: 50
      });
      
      if (nextPage.data && nextPage.data.length > 0) {
        logger.log(`Found ${nextPage.data.length} more fields in page ${pageCount}`);
        allFields = [...allFields, ...nextPage.data];
      }
      
      hasNextPage = nextPage.hasNextPage;
      cursor = nextPage.nextCursor;
    }
    
    logger.log(`Found total of ${allFields.length} dynamic fields in kiosk ${kioskId} across ${pageCount} pages`);
    
    // Array to store all kiosk items
    const kioskItems = [];
    
    // Keywords that might indicate an item field
    const itemKeywords = ['item', 'listing', 'nft', 'token', 'object', 'asset'];
    
    // Process all fields to find the items
    for (const field of allFields) {
      const fieldName = field.name?.value;
      const fieldType = field.name?.type || '';
      
      // Check if this looks like an item field
      const isItemField = 
        // Standard item field check
        (typeof fieldType === 'string' && 
         (fieldType.toLowerCase().includes('item') || 
          fieldType.toLowerCase().includes('listing'))) ||
        // Additional checks for item-like fields
        (itemKeywords.some(keyword => 
          fieldType.toLowerCase().includes(keyword)
        ));
      
      if (!isItemField) {
        // Log skipped fields for debugging
        logger.log(`Skipping non-item field: ${fieldType}`);
        continue;
      }
      
      try {
        // Get the field object which should contain the item
        const fieldObj = await client.getObject({
          id: field.objectId,
          options: {
            showType: true,
            showContent: true,
            showDisplay: true,
            showOwner: true
          }
        });
        
        // Extract the item ID from the field - check multiple possible paths
        const itemIdField = 
          fieldObj.data?.content?.fields?.value?.fields?.id?.id || 
          fieldObj.data?.content?.fields?.value?.fields?.item?.fields?.id?.id ||
          fieldObj.data?.content?.fields?.value?.id ||
          fieldObj.data?.content?.fields?.item?.fields?.id?.id ||
          fieldObj.data?.content?.fields?.item?.id;
        
        // If we can't find an item ID directly, try to extract from nested structures
        const alternateItemId = extractItemIdFromField(fieldObj.data);
        const finalItemId = itemIdField || alternateItemId;
        
        if (finalItemId) {
          try {
            // Get the actual item object
            const itemObj = await client.getObject({
              id: finalItemId,
              options: {
                showType: true, 
                showContent: true,
                showDisplay: true,
                showOwner: true
              }
            });
            
            if (itemObj.data) {
              // Extract useful information from the item
              const type = itemObj.data.type || '';
              const displayData = itemObj.data.display?.data || {};
              const content = itemObj.data.content?.fields || {};
              
              // Log if we find an Aya Pass in the kiosk
              const AYA_PASS_PACKAGE_ID = '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690';
              if (type.startsWith(AYA_PASS_PACKAGE_ID)) {
                logger.log(`*** FOUND AYA PASS IN KIOSK: ${type}, ${itemObj.data.objectId}`);
              }
              
              // Look for an image URL in various places
              let imageUrl = displayData.image_url || displayData.image || 
                           content.url || content.image_url || content.media_url || 
                           findImageInObject(itemObj.data);
              
              if (imageUrl) {
                imageUrl = formatIPFSUrl(imageUrl);
              }
              
              // Add this item to our list with relevant data
              const processedItem = {
                objectId: itemObj.data.objectId,
                type: type,
                name: displayData.name || content.name || 'Unknown NFT',
                description: displayData.description || content.description || '',
                image_url: imageUrl,
                kiosk_id: kioskId,
                is_listed: field.name?.type?.toLowerCase().includes('listing'),
                raw_data: {
                  display: displayData,
                  content: content
                }
              };
              
              kioskItems.push(processedItem);
            }
          } catch (err) {
            logger.error(`Error getting item ${finalItemId}:`, err);
          }
        } else {
          // Log if we can't find an item ID
          logger.log(`Couldn't extract item ID from field ${field.objectId}`);
        }
      } catch (err) {
        logger.error(`Error getting field ${field.objectId}:`, err);
      }
    }
    
    logger.log(`Found ${kioskItems.length} items in kiosk ${kioskId}`);
    return kioskItems;
  } catch (error) {
    logger.error(`Error getting items for kiosk ${kioskId}:`, error);
    return [];
  }
};

// Helper function to extract item ID from a field object
function extractItemIdFromField(data) {
  if (!data) return null;
  
  // Try to find any object ID in various nested structures
  const potentialIds = [];
  
  const findIds = (obj, path = '') => {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this object has an ID field that looks like a Sui object ID
    if (obj.id && typeof obj.id === 'string' && obj.id.startsWith('0x') && obj.id.length >= 40) {
      potentialIds.push({ id: obj.id, path: path + '.id' });
    }
    
    // Check for objectId field
    if (obj.objectId && typeof obj.objectId === 'string' && obj.objectId.startsWith('0x') && obj.objectId.length >= 40) {
      potentialIds.push({ id: obj.objectId, path: path + '.objectId' });
    }
    
    // Recursively check all properties
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        findIds(obj[key]);
      } else if (key === 'id' || key === 'objectId') {
        // Already checked these at this level
      } else if (typeof obj[key] === 'string' && obj[key].startsWith('0x') && obj[key].length >= 40) {
        // This could be an object ID directly stored in a field
        potentialIds.push({ id: obj[key], path: path + '.' + key });
      }
    }
  };
  
  findIds(data);
  
  // Log all potential IDs for debugging
  if (potentialIds.length > 0) {
    logger.log(`Found ${potentialIds.length} potential item IDs in field`);
    potentialIds.forEach(({ id, path }) => {
      logger.log(`  - ${id} (${path})`);
    });
    
    // Return the first ID we found - could be improved with better heuristics
    return potentialIds[0].id;
  }
  
  return null;
}

/**
 * Get all items from all kiosks owned by a user
 * @param {Object} client - SUI client
 * @param {string} address - The wallet address
 * @returns {Promise<Array>} - Array of all kiosk items
 */
export const getAllUserKioskItems = async (client, address) => {
  logger.log(`=== CHECKING ALL KIOSK ITEMS FOR ${address} ===`);
  
  try {
    // First find all kiosks owned by the user
    const kioskIds = await findUserKiosks(client, address);
    
    if (!kioskIds.length) {
      logger.log(`No kiosks found for address ${address}`);
      return [];
    }
    
    // Get items from each kiosk
    const allItems = [];
    
    for (const kioskId of kioskIds) {
      // Ensure kioskId is a string
      if (typeof kioskId === 'string') {
        const kioskItems = await getKioskItems(client, kioskId);
        allItems.push(...kioskItems);
      } else {
        logger.error(`Invalid kiosk ID format: ${typeof kioskId}`, kioskId);
      }
    }
    
    logger.log(`Found total of ${allItems.length} items across ${kioskIds.length} kiosks`);
    return allItems;
  } catch (error) {
    logger.error('Error fetching all kiosk items:', error);
    return [];
  }
};

/**
 * Check if a specific item exists in any of the user's kiosks
 * @param {Object} client - SUI client
 * @param {string} address - The wallet address
 * @param {string} structType - The struct type to check for
 * @returns {Promise<boolean>} - Whether the item exists in any kiosk
 */
export const checkItemInKiosks = async (client, address, structType) => {
  try {
    const allItems = await getAllUserKioskItems(client, address);
    const matchingItems = allItems.filter(item => item.type && item.type.includes(structType));
    
    return matchingItems.length > 0;
  } catch (error) {
    logger.error(`Error checking for item type ${structType} in kiosks:`, error);
    return false;
  }
};

/**
 * Find all objects in a wallet and analyze them for potential NFTs
 * @param {Object} client - Sui client
 * @param {string} address - Wallet address
 * @returns {Promise<Array>} - All wallet objects with analysis
 */
export const findAllWalletObjects = async (client, address) => {
  try {
    logger.log(`Finding all wallet objects for ${address}`);
    
    let allObjects = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;
    let pageSize = 0;
    let totalItemsFound = 0;
    
    // Use pagination to get ALL owned objects
    while (hasNextPage) {
      pageCount++;
      logger.log(`Fetching page ${pageCount} of wallet objects with cursor: ${cursor || 'null'}`);
      
      const response = await client.getOwnedObjects({
        owner: address,
        cursor,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
          showOwner: true,
        },
        // Explicitly request 50 items per page (maximum allowed by SUI API)
        limit: 50
      });
      
      if (response.data && response.data.length > 0) {
        pageSize = response.data.length;
        totalItemsFound += pageSize;
        logger.log(`Page ${pageCount} contains ${pageSize} objects (total so far: ${totalItemsFound})`);
        
        // Process the objects to extract relevant information
        const processedObjects = response.data.map(obj => {
          const objectData = obj.data;
          const displayData = objectData?.display?.data || {};
          const content = objectData?.content?.fields || {};
          
          // Extract image URL from various places
          let imageUrl = displayData.image_url || 
                        content.url || 
                        content.image_url || 
                        content.media_url ||
                        findImageInObject(content);
          
          if (imageUrl) {
            imageUrl = formatIPFSUrl(imageUrl);
          }
          
          // Extract package ID from type
          let packageId = null;
          if (objectData?.type) {
            const typeParts = objectData.type.split('::');
            if (typeParts.length > 0) {
              packageId = typeParts[0];
            }
          }
          
          return {
            objectId: objectData.objectId,
            type: objectData.type,
            name: displayData.name || content.name || null,
            description: displayData.description || content.description || null,
            image_url: imageUrl,
            display: displayData,
            content: content,
            packageId: packageId
          };
        });
        
        allObjects.push(...processedObjects);
      } else {
        logger.log(`Page ${pageCount} contains 0 objects`);
      }
      
      // Check if there are more pages
      hasNextPage = response.hasNextPage;
      cursor = response.nextCursor;
      
      logger.log(`Page ${pageCount} hasNextPage: ${hasNextPage}, nextCursor: ${cursor || 'null'}`);
    }
    
    const typeCount = {};
    allObjects.forEach(obj => {
      if (obj.type) {
        typeCount[obj.type] = (typeCount[obj.type] || 0) + 1;
      }
    });
    
    logger.log(`Found ${allObjects.length} total objects in wallet ${address} across ${pageCount} pages`);
    logger.log(`Found ${Object.keys(typeCount).length} distinct object types`);
    
    // Look for Aya Pass specifically
    const AYA_PASS_PACKAGE_ID = '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690';
    const AYA_PASS_TYPE = `${AYA_PASS_PACKAGE_ID}::everyone_will_cry__::Nft`;
    
    // Additional variations to check
    const AYA_PASS_VARIATIONS = [
      AYA_PASS_TYPE,
      AYA_PASS_TYPE.toLowerCase(),
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry::Nft`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry_::Nft`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry__::NFT`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry__::nft`,
    ];
    
    const ayaPassObjects = allObjects.filter(obj => 
      obj.type && obj.type.startsWith(AYA_PASS_PACKAGE_ID)
    );
    
    if (ayaPassObjects.length > 0) {
      logger.log(`Found ${ayaPassObjects.length} objects from AYA PASS package ID:`);
      ayaPassObjects.forEach(obj => {
        logger.log(`  - ${obj.objectId}: ${obj.type}`);
        
        // Check for exact matches with any of the variations
        const isExactMatch = AYA_PASS_VARIATIONS.some(variation => 
          obj.type === variation || obj.type.toLowerCase() === variation.toLowerCase()
        );
        
        if (isExactMatch) {
          logger.log(`    ** EXACT MATCH for Aya Pass with variation **`);
        }
      });
    } else {
      logger.log(`No objects found from Aya Pass package`);
    }
    
    return allObjects;
  } catch (error) {
    logger.error('Error finding wallet objects:', error);
    return [];
  }
};

export const findAllMatchingNFTs = async (client, address, activeCollections) => {
  const exactMatches = [];
  const packageMatches = [];
  
  logger.log(`Finding matching NFTs for address ${address}`);
  
  try {
    // Get all objects in the wallet - make sure we get ALL pages
    const allWalletObjects = await findAllWalletObjects(client, address);
    logger.log(`Checking ${allWalletObjects.length} wallet objects against ${activeCollections.length} active collections`);
    
    // Create lookup maps for collection types and package IDs
    const collectionTypeMap = {};
    const packageIdMap = {};
    
    activeCollections.forEach(collection => {
      // Get the collection type and normalize it
      const collectionType = collection.type || collection.collectionType;
      if (!collectionType) return;
      
      // Add to type map for exact matches
      collectionTypeMap[collectionType] = collection;
      collectionTypeMap[collectionType.toLowerCase()] = collection; // Also add lowercase version for case-insensitive matching
      
      // Extract package ID for package-level matches
      const packageId = collectionType.split('::')[0];
      if (packageId) {
        if (!packageIdMap[packageId]) {
          packageIdMap[packageId] = [];
        }
        packageIdMap[packageId].push(collection);
      }
      
      // Log Aya Pass collection if found
      if (collectionType.includes('0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690')) {
        logger.log(`Found Aya Pass in active collections: ${collectionType}`);
      }
    });
    
    // First, check for direct Aya Pass matches
    const AYA_PASS_PACKAGE_ID = '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690';
    const AYA_PASS_TYPE = `${AYA_PASS_PACKAGE_ID}::everyone_will_cry__::Nft`;
    
    // Create a few variations to try matching
    const ayaPassVariations = [
      AYA_PASS_TYPE,
      AYA_PASS_TYPE.toLowerCase(),
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry::Nft`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry_::Nft`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry__::NFT`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry__::nft`,
      `${AYA_PASS_PACKAGE_ID}::EveryoneWillCry__::Nft`,
      `${AYA_PASS_PACKAGE_ID}::everyone_will_cry_::NFT`,
    ];
    
    // Look for any Aya Pass objects
    const ayaPassObjects = allWalletObjects.filter(obj => 
      obj.type && obj.type.startsWith(AYA_PASS_PACKAGE_ID)
    );
    
    if (ayaPassObjects.length > 0) {
      logger.log(`=== Found ${ayaPassObjects.length} objects from AYA PASS package ID ===`);
      
      // Try to find an exact match first
      for (const obj of ayaPassObjects) {
        // Check against all variations of Aya Pass type
        const matchingVariation = ayaPassVariations.find(variant => 
          obj.type === variant || obj.type.toLowerCase() === variant.toLowerCase()
        );
        
        if (matchingVariation) {
          logger.log(`Found exact Aya Pass match: ${obj.objectId} with type ${obj.type}`);
          
          // Get the Aya Pass collection from active collections
          const ayaPassCollection = activeCollections.find(c => 
            (c.type === AYA_PASS_TYPE) || (c.collectionType === AYA_PASS_TYPE) ||
            (c.type && c.type.startsWith(AYA_PASS_PACKAGE_ID)) || 
            (c.collectionType && c.collectionType.startsWith(AYA_PASS_PACKAGE_ID))
          );
          
          if (ayaPassCollection) {
            exactMatches.push({
              ...ayaPassCollection,
              verified: true,
              collectionType: obj.type,
              name: obj.name || ayaPassCollection.name || 'Aya Pass',
              description: obj.description || ayaPassCollection.description || 'Aya Pass NFT',
              image_url: obj.image_url,
              objectId: obj.objectId,
              matchType: 'aya_pass_exact'
            });
            logger.log(`Added Aya Pass to exact matches with objectId ${obj.objectId}`);
          } else {
            logger.log(`WARNING: Found Aya Pass object but no matching collection in activeCollections`);
          }
        } else {
          // If no exact match, but it's still from the Aya Pass package
          logger.log(`Found Aya Pass package object: ${obj.objectId} with type ${obj.type}`);
          
          // Get the Aya Pass collection from active collections
          const ayaPassCollection = activeCollections.find(c => 
            (c.type === AYA_PASS_TYPE) || (c.collectionType === AYA_PASS_TYPE) ||
            (c.type && c.type.startsWith(AYA_PASS_PACKAGE_ID)) || 
            (c.collectionType && c.collectionType.startsWith(AYA_PASS_PACKAGE_ID))
          );
          
          if (ayaPassCollection) {
            packageMatches.push({
              ...ayaPassCollection,
              verified: true,
              collectionType: AYA_PASS_TYPE,  // Use the expected type
              name: obj.name || ayaPassCollection.name || 'Aya Pass',
              description: obj.description || ayaPassCollection.description || 'Aya Pass NFT',
              image_url: obj.image_url,
              objectId: obj.objectId,
              matchType: 'aya_pass_package'
            });
            logger.log(`Added Aya Pass to package matches with objectId ${obj.objectId}`);
          } else {
            logger.log(`WARNING: Found Aya Pass package object but no matching collection in activeCollections`);
            
            // Add it anyway as a special case
            packageMatches.push({
              verified: true,
              collectionType: AYA_PASS_TYPE,
              name: obj.name || 'Aya Pass',
              description: obj.description || 'Aya Pass NFT',
              image_url: obj.image_url,
              objectId: obj.objectId,
              matchType: 'aya_pass_special_case'
            });
            logger.log(`Added Aya Pass as special case with objectId ${obj.objectId}`);
          }
        }
      }
    }
    
    // Now process all wallet objects for regular matching
    for (const obj of allWalletObjects) {
      const objType = obj.type;
      const objTypeLower = objType ? objType.toLowerCase() : '';
      const objPackageId = obj.packageId;
      
      // Skip objects without a type
      if (!objType) continue;
      
      // Skip Aya Pass objects as we've already processed them
      if (objType.startsWith(AYA_PASS_PACKAGE_ID)) continue;
      
      // APPROACH 1: Check for exact type match (most reliable)
      if (collectionTypeMap[objType] || collectionTypeMap[objTypeLower]) {
        const collection = collectionTypeMap[objType] || collectionTypeMap[objTypeLower];
        logger.log(`Found exact type match for ${obj.objectId}: ${objType} with collection ${collection.name}`);
        
        exactMatches.push({
          ...collection,
          verified: true,
          collectionType: objType,
          name: obj.name || collection.name || 'Unnamed NFT',
          description: obj.description || collection.description,
          image_url: obj.image_url,
          objectId: obj.objectId,
          matchType: 'exact_type'
        });
        
        continue; // Skip to next object since we found an exact match
      }
      
      // APPROACH 2: Check for package ID match (less specific but still reliable)
      if (objPackageId && packageIdMap[objPackageId]) {
        const matchingCollections = packageIdMap[objPackageId];
        const collection = matchingCollections[0]; // Use the first collection from this package
        
        logger.log(`Found package match for ${obj.objectId}: ${objType} with package ${objPackageId}`);
        
        packageMatches.push({
          ...collection,
          verified: true,
          collectionType: objType,
          name: obj.name || collection.name || 'Unnamed NFT',
          description: obj.description || collection.description,
          image_url: obj.image_url,
          objectId: obj.objectId,
          matchType: 'package_id'
        });
        
        continue; // Skip to next object
      }
    }
    
    // Combine all matches, prioritizing exact matches, then package
    const allMatches = [...exactMatches, ...packageMatches];
    
    // Log our findings
    logger.log(`Found ${exactMatches.length} exact type matches`);
    logger.log(`Found ${packageMatches.length} package ID matches`);
    logger.log(`Returning ${allMatches.length} total verified NFTs`);
    
    return allMatches;
  } catch (error) {
    logger.error('Error finding matching NFTs:', error);
    return [];
  }
};

// Helper to extract all potential object IDs from data
function extractAllObjectIds(data) {
  const ids = new Set();
  
  function recursiveExtract(obj) {
    if (!obj) return;
    
    // Check if the object itself is an ID
    if (typeof obj === 'string' && obj.startsWith('0x') && obj.length >= 40) {
      ids.add(obj);
      return;
    }
    
    // Check for id field
    if (obj.id && typeof obj.id === 'string' && obj.id.startsWith('0x')) {
      ids.add(obj.id);
    }
    
    // Check for objectId field
    if (obj.objectId && typeof obj.objectId === 'string' && obj.objectId.startsWith('0x')) {
      ids.add(obj.objectId);
    }
    
    // Check common field names
    const commonFields = ['value', 'nft', 'item', 'object', 'token', 'id'];
    for (const field of commonFields) {
      if (obj[field] && typeof obj[field] === 'string' && obj[field].startsWith('0x')) {
        ids.add(obj[field]);
      }
    }
    
    // Recurse into object properties
    if (typeof obj === 'object') {
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          recursiveExtract(obj[key]);
        } else if (key === 'id' || key === 'objectId') {
          // Already checked these at this level
        } else if (typeof obj[key] === 'string' && obj[key].startsWith('0x') && obj[key].length >= 40) {
          // This could be an object ID directly stored in a field
          ids.add(obj[key]);
        }
      }
    }
    
    // Check arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        recursiveExtract(item);
      }
    }
  }
  
  recursiveExtract(data);
  return Array.from(ids);
}

// Helper to check if an object looks like an NFT
function isObjectLikelyNFT(objectData) {
  if (!objectData?.data) return false;
  
  // Check if it has display data with name and image (strong indicator)
  if (objectData.data.display?.data?.name && objectData.data.display?.data?.image_url) {
    return true;
  }
  
  // Check if type contains specific NFT-related terms (avoid too generic terms)
 
  
  // Check for specific Aya Pass package ID
  if (type.includes('0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690')) {
    return true;
  }
  
  // More restrictive check for content fields
  const fields = objectData.data.content?.fields || {};
  if ((fields.name && fields.image_url) || (fields.name && fields.url)) {
    return true;
  }
  
  return false;
}

// Helper to find image URL in an object structure
function findImageInObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  
  // Common image field names
  const imageFields = ['image', 'image_url', 'imageUrl', 'img', 'url', 'uri', 'media', 'media_url'];
  
  for (const field of imageFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      const fieldValue = obj[field];
      // Check if it's likely an image URL
      if (fieldValue.match(/\.(jpg|jpeg|png|gif|svg|webp)($|\?)/i) ||
          fieldValue.startsWith('ipfs://') ||
          fieldValue.startsWith('https://ipfs.io/') ||
          fieldValue.includes('image') ||
          fieldValue.includes('media')) {
        return fieldValue;
      }
    }
  }
  
  // Look for display field which might contain image data
  if (obj.display && typeof obj.display === 'object') {
    if (obj.display.image_url) return obj.display.image_url;
    if (obj.display.image) return obj.display.image;
    
    // Try to extract from display fields
    for (const key in obj.display) {
      if (typeof obj.display[key] === 'string' && 
          (key.includes('image') || key.includes('url') || key.includes('media'))) {
        return obj.display[key];
      }
    }
  }
  
  // Look for special patterns in URL fields
  if (obj.url && typeof obj.url === 'string') {
    return obj.url;
  }
  
  // Recurse into nested objects
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = findImageInObject(obj[key]);
      if (found) return found;
    }
  }
  
  return null;
}

// Update the Blockberry API function to match against active collections
export const fetchBlockberryNFTs = async (walletAddress, activeCollections = []) => {
  if (!walletAddress) {
    console.error('No wallet address provided for Blockberry API fetch');
    return { nfts: [], kioskNfts: [] };
  }

  try {
    const options = {
      method: 'POST',
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        'x-api-key': '9wx8Mn6NuBmm1xwqgRrO7mbwASESnw'
      },
      body: JSON.stringify({ objectTypes: ['nft', 'kiosk'] })
    };

    console.log(`Fetching Blockberry NFTs for wallet: ${walletAddress}`);
    const response = await fetch(`https://api.blockberry.one/sui/v1/accounts/${walletAddress}/objects`, options);
    
    if (!response.ok) {
      throw new Error(`Blockberry API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Blockberry API found ${data.nfts?.length || 0} direct NFTs and ${data.kiosks?.length || 0} kiosk items`);

    // Create a map of collection types for quicker lookup
    const collectionsMap = {};
    if (activeCollections && activeCollections.length > 0) {
      activeCollections.forEach(collection => {
        const collectionType = collection.type || collection.collectionType;
        if (collectionType) {
          collectionsMap[collectionType.toLowerCase()] = collection;
        }
      });
    }
    
    // Process direct NFTs and match against active collections
    const allDirectNfts = (data.nfts || []).map(nft => ({
      id: nft.id,
      type: nft.type,
      name: nft.name,
      image_url: nft.imgUrl,
      collection_name: nft.name?.split('#')[0]?.trim() || 'Unknown Collection',
      securityMessage: nft.securityMessage,
      source: 'blockberry'
    }));
    
    // Process kiosk NFTs - only include those with objectType "NFT"
    const allKioskNfts = (data.kiosks || [])
      .filter(item => item.objectType === "NFT" && item.subType === "Kiosk")
      .map(nft => ({
        id: nft.id,
        type: nft.type,
        name: nft.name,
        image_url: nft.imgUrl,
        collection_name: nft.name?.split('#')[0]?.trim() || 'Unknown Collection',
        in_kiosk: true,
        kiosk_id: 'blockberry_kiosk', // We don't have the actual kiosk ID from this API
        source: 'blockberry'
      }));

    console.log(`Processed ${allDirectNfts.length} direct NFTs and ${allKioskNfts.length} kiosk NFTs from Blockberry`);
    
    // Match NFTs against active collections
    let matchedDirectNfts = [];
    let matchedKioskNfts = [];
    
    // Special case: always include Aya Pass NFT
    const AYA_PASS_TYPE = '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690::everyone_will_cry__::Nft';
    
    if (activeCollections && activeCollections.length > 0) {
      console.log(`Matching Blockberry NFTs against ${activeCollections.length} active collections`);
      
      // Match direct NFTs
      matchedDirectNfts = allDirectNfts.filter(nft => {
        if (!nft.type) return false;
        
        // Always include Aya Pass
        if (nft.type.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())) {
          console.log('🎉 Found Aya Pass NFT in direct NFTs');
          return true;
        }
        
        // Check for exact match with any active collection
        for (const collection of activeCollections) {
          const collectionType = (collection.type || collection.collectionType || '').toLowerCase();
          if (!collectionType) continue;
          
          // Exact match
          if (nft.type.toLowerCase() === collectionType) {
            console.log(`Found exact match for Blockberry NFT: ${nft.name} (${nft.type})`);
            return true;
          }
          
          // Package match
          const nftPackage = nft.type.split('::')[0];
          const collPackage = collectionType.split('::')[0];
          if (nftPackage && collPackage && nftPackage === collPackage) {
            console.log(`Found package match for Blockberry NFT: ${nft.name} (${nft.type})`);
            return true;
          }
        }
        
        return false;
      });
      
      // Match kiosk NFTs
      matchedKioskNfts = allKioskNfts.filter(nft => {
        if (!nft.type) return false;
        
        // Always include Aya Pass
        if (nft.type.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())) {
          console.log('🎉 Found Aya Pass NFT in kiosk NFTs');
          return true;
        }
        
        // Check for exact match with any active collection
        for (const collection of activeCollections) {
          const collectionType = (collection.type || collection.collectionType || '').toLowerCase();
          if (!collectionType) continue;
          
          // Exact match
          if (nft.type.toLowerCase() === collectionType) {
            console.log(`Found exact match for Blockberry kiosk NFT: ${nft.name} (${nft.type})`);
            return true;
          }
          
          // Package match
          const nftPackage = nft.type.split('::')[0];
          const collPackage = collectionType.split('::')[0];
          if (nftPackage && collPackage && nftPackage === collPackage) {
            console.log(`Found package match for Blockberry kiosk NFT: ${nft.name} (${nft.type})`);
            return true;
          }
        }
        
        return false;
      });
    } else {
      console.log('No active collections provided, returning only Aya Pass NFTs');
      // If no active collections provided, only include Aya Pass NFTs, not all NFTs
      matchedDirectNfts = allDirectNfts.filter(nft => 
        nft.type && nft.type.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())
      );
      matchedKioskNfts = allKioskNfts.filter(nft => 
        nft.type && nft.type.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())
      );
    }
    
    console.log(`Matched ${matchedDirectNfts.length}/${allDirectNfts.length} direct NFTs and ${matchedKioskNfts.length}/${allKioskNfts.length} kiosk NFTs against active collections`);
    
    // Check if we found the Aya Pass
    const ayaPassNFT = matchedKioskNfts.find(nft => 
      nft.type?.toLowerCase().includes(AYA_PASS_TYPE.toLowerCase())
    );
    
    if (ayaPassNFT) {
      console.log('✓ Confirmed Aya Pass NFT matched via Blockberry API:', ayaPassNFT);
    } else {
      console.log('⚠️ Aya Pass NFT not found in matched Blockberry API results');
    }

    return {
      nfts: matchedDirectNfts,
      kioskNfts: matchedKioskNfts,
      allDirectNfts,  // Include all NFTs for debugging
      allKioskNfts    // Include all NFTs for debugging
    };
  } catch (error) {
    console.error('Error fetching from Blockberry API:', error);
    return { nfts: [], kioskNfts: [], allDirectNfts: [], allKioskNfts: [] };
  }
};

// Helper function to create NFT object from object data and collection
function createNFTObject(objectData, collection) {
  const display = objectData.display || {};
  const fields = objectData.content?.fields || {};
  
  // Extract name, either from display or fields
  let name = display.name || fields.name || fields.nft_name || 'Unnamed NFT';
  
  // Get image URL from display or try to find it in fields
  let imageUrl = display.image_url || findImageInObject(fields);
  
  return {
    id: objectData.objectId,
    type: objectData.type,
    name,
    image_url: imageUrl,
    collection_name: collection.name || 'Unknown Collection',
    collection_type: collection.type || collection.collectionType
  };
}

// Helper function to create a generic NFT object when no collection match
function createGenericNFTObject(objectData) {
  const display = objectData.display || {};
  const fields = objectData.content?.fields || {};
  
  // Get the best name we can find
  let name = display.name || fields.name || fields.nft_name || 'Unnamed NFT';
  
  // Try to extract collection name from the type or name
  let collectionName = 'Unknown Collection';
  
  if (objectData.type) {
    const typeParts = objectData.type.split('::');
    if (typeParts.length > 1) {
      collectionName = typeParts[1].replace(/_/g, ' ');
      // Capitalize first letter of each word
      collectionName = collectionName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  } else if (name.includes('#')) {
    // Try to extract collection name from NFT name format "Collection Name #123"
    collectionName = name.split('#')[0].trim();
  }
  
  // Get image URL from display or try to find it in fields
  let imageUrl = display.image_url || findImageInObject(fields);
  
  return {
    id: objectData.objectId,
    type: objectData.type,
    name,
    image_url: imageUrl,
    collection_name: collectionName,
    likely_nft: true
  };
}

// Helper function to check for partial type matches
function isPartialTypeMatch(objectType, collectionType) {
  if (!objectType || !collectionType) return false;
  
  const objTypeLower = objectType.toLowerCase();
  const collTypeLower = collectionType.toLowerCase();
  
  // Only do exact matching with collection types from the API
  // This prevents matching unrelated NFTs that happen to share common terms
  if (objTypeLower === collTypeLower) {
    return true;
  }
  
  // For exact package ID matching only (more restrictive than partial matching)
  const objPackage = objTypeLower.split('::')[0];
  const collPackage = collTypeLower.split('::')[0];
  
  if (objPackage && collPackage && objPackage === collPackage) {
    return true;
  }
  
  // Removed generic partial matching that was too loose
  
  return false;
}

/**
 * Clear the NFT cache for a specific wallet
 * @param {string} address - The wallet address
 */
export const clearNFTCacheForWallet = (address) => {
  nftCache.clearWalletCache(address);
};

/**
 * Clear all NFT caches
 */
export const clearAllNFTCaches = () => {
  nftCache.clearAllCaches();
};

/**
 * Check if we have cached NFTs for a wallet
 * @param {string} address - The wallet address
 */
export const hasCachedNFTs = (address) => {
  return !!nftCache.getWalletNFTs(address);
};

export default {
  formatIPFSUrl,
  getNFTDetails,
  queryChillCatsNFTs,
  checkCollectionNFTs,
  fetchActiveCollections,
  checkUserNFTs,
  checkSpecificNFTOwnership,
  findUserKiosks,
  getKioskItems,
  getAllUserKioskItems,
  checkItemInKiosks,
  matchKioskItemsToCollections,
  checkUserNFTsAndKiosk,
  findAllMatchingNFTs,
  clearNFTCacheForWallet,
  clearAllNFTCaches,
  hasCachedNFTs
}; 