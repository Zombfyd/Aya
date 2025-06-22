/**
 * NFT Verifier: Browser-Compatible JavaScript Version
 *
 * - Caches active collections on load for performance.
 * - Reports progress via a callback function.
 * - Uses Sui RPC API to find kiosks owned by a wallet
 * - Extracts NFTs from kiosks using dynamic fields
 * - Matches NFTs to active collections with detailed debug logging
 * - Outputs data in the format expected by GameApp.jsx
 */

import axios from 'axios';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const AYA_API_ENDPOINT = import.meta.env.VITE_APP_API_URL || 'https://ayagame.onrender.com';
const SUI_RPC_ENDPOINT = 'https://fullnode.mainnet.sui.io:443';

// ============================================================================
//  ACTIVE COLLECTIONS CACHING
// ============================================================================

let activeCollectionsPromise = null;

/**
 * Fetches collections from the backend or returns the cached promise.
 * This is now an internal function controlled by checkUserNFTs.
 * @param {boolean} forceRefresh - If true, re-fetches from the backend.
 */
function getActiveCollections(forceRefresh = false) {
  if (forceRefresh || !activeCollectionsPromise) {
    console.log(`[Cache] ${forceRefresh ? 'Forced refresh:' : 'Initial fetch:'} Fetching active collections...`);
    activeCollectionsPromise = axios.get(`${AYA_API_ENDPOINT}/api/sui/collections/active`, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    }).then(response => {
      if (!response.data || !Array.isArray(response.data)) {
        console.error(`[Cache] ❌ Invalid response format:`, response.data);
        throw new Error('Invalid active collections response format');
      }
      console.log(`[Cache] ✅ Fetched and cached ${response.data.length} active collections.`);
      return response.data;
    }).catch(error => {
      console.error(`[Cache] ❌ Error fetching active collections:`, error);
      activeCollectionsPromise = null; // Reset promise on error to allow retries
      return []; // Return an empty array on error
    });
    } else {
    console.log('[Cache] ✅ Using cached active collections.');
  }
  return activeCollectionsPromise;
}

// Trigger the initial fetch when the module first loads.
getActiveCollections();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Fetch object details from Sui RPC
 */
async function fetchObjectDetails(objectId) {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "sui_getObject",
    params: [
      objectId,
      {
        showType: true,
        showContent: true,
        showOwner: true,
        showPreviousTransaction: true,
        showDisplay: true
      }
    ]
  };

  const response = await axios.post(SUI_RPC_ENDPOINT, payload, {
      timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data?.result?.data || {};
}

// ============================================================================
// BACKEND API FUNCTIONS (Now handled by caching logic)
// ============================================================================

// This function is kept for structural clarity but the logic is now in the caching section
async function fetchActiveCollections() {
    return activeCollectionsPromise;
}

// ============================================================================
// SUI RPC FUNCTIONS
// ============================================================================

/**
 * Get total object count for a wallet by actually counting them
 */
async function getWalletObjectCount(walletAddress) {
  console.log(`Getting total object count for wallet: ${walletAddress}`);
  
  let totalCount = 0;
    let cursor = null;
    let hasNextPage = true;
    
    while (hasNextPage) {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getOwnedObjects",
      params: [walletAddress, {}, cursor, 50]
    };

    const response = await axios.post(SUI_RPC_ENDPOINT, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data?.result || {};
    const objects = data.data || [];
    hasNextPage = data.hasNextPage || false;
    cursor = data.nextCursor;

    totalCount += objects.length;
    
    // Add a small delay to avoid rate limiting
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log(`Total objects found: ${totalCount}`);
  return totalCount;
}

/**
 * Get all kiosk addresses owned by a wallet and process them immediately
 */
async function getWalletKioskAddresses(walletAddress, activeCollections, onProgress = null, onNFTFound = null) {
  console.log(`Finding kiosks for wallet: ${walletAddress}`);
  
  onProgress?.({ 
    stage: 'kiosk_discovery', 
    message: `Finding kiosks in wallet...`, 
    current: 0, 
    total: 0,
    assetsFound: 0
  });
  
  const kioskAddresses = [];
  const processedKiosks = [];
    let cursor = null;
    let hasNextPage = true;
  let assetsFound = 0;
    
    while (hasNextPage) {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getOwnedObjects",
      params: [walletAddress, {}, cursor, 50]
    };

    const response = await axios.post(SUI_RPC_ENDPOINT, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data?.result || {};
    const objects = data.data || [];
    hasNextPage = data.hasNextPage || false;
    cursor = data.nextCursor;

    // Process each object to find kiosk-related ones
    for (const obj of objects) {
      const objectId = obj.data?.objectId;
      if (!objectId) continue;

      try {
        const objData = await fetchObjectDetails(objectId);
        const objType = objData.type || '';

        if (objType.includes('::kiosk::KioskOwnerCap')) {
            // Standard KioskOwnerCap
          const content = objData.content || {};
          const kioskAddress = content.fields?.for;
          if (kioskAddress) {
            const kioskInfo = {
              kiosk_address: kioskAddress,
              cap_object_id: objectId,
              cap_type: objType,
              kiosk_type: 'standard'
            };
            kioskAddresses.push(kioskInfo);
            console.log(`Found standard kiosk: ${kioskAddress}`);
            
            // Process this kiosk immediately in the background
            processSingleKiosk(kioskInfo, onProgress).then(kioskResult => {
              processedKiosks.push(kioskResult);
              
              // Process NFTs from this kiosk immediately
              for (const nft of kioskResult.nfts) {
                const collection = activeCollections.find(c => c.collectionType.trim() === nft.nft_type.trim());
                if (collection) {
                  const verifiedNFT = {
                    objectId: nft.nft_object_id,
                    type: nft.nft_type,
                    collectionName: collection.name,
                    collectionType: collection.collectionType,
                    discountPercentage: collection.discount,
                    media_url: getNFTImageUrl(nft),
                    image_url: getNFTImageUrl(nft),
                    name: getNFTName(nft),
                    kioskAddress: nft.kiosk_address,
                    kioskType: nft.kiosk_type,
                    nftContent: nft.nft_content,
                    nftDisplay: nft.nft_display,
                    extractionTimestamp: nft.extraction_timestamp,
                    isActiveCollection: true,
                    collectionMeta: collection,
                    ownershipType: 'kiosk'
                  };
                  onNFTFound?.(verifiedNFT);
                }
              }
            }).catch(error => {
              console.error('Error in kiosk processing:', error);
            });
          }
        } else if (objType.includes('PersonalKioskCap')) {
            // PersonalKioskCap
          const content = objData.content || {};
          const cap = content.fields?.cap;
          const kioskAddress = cap?.fields?.for;
          if (kioskAddress) {
            const kioskInfo = {
              kiosk_address: kioskAddress,
              cap_object_id: objectId,
              cap_type: objType,
              kiosk_type: 'personal'
            };
            kioskAddresses.push(kioskInfo);
            console.log(`Found personal kiosk: ${kioskAddress}`);
            
            // Process this kiosk immediately in the background
            processSingleKiosk(kioskInfo, onProgress).then(kioskResult => {
              processedKiosks.push(kioskResult);
              
              // Process NFTs from this kiosk immediately
              for (const nft of kioskResult.nfts) {
                const collection = activeCollections.find(c => c.collectionType.trim() === nft.nft_type.trim());
                if (collection) {
                  const verifiedNFT = {
                    objectId: nft.nft_object_id,
                    type: nft.nft_type,
                    collectionName: collection.name,
                    collectionType: collection.collectionType,
                    discountPercentage: collection.discount,
                    media_url: getNFTImageUrl(nft),
                    image_url: getNFTImageUrl(nft),
                    name: getNFTName(nft),
                    kioskAddress: nft.kiosk_address,
                    kioskType: nft.kiosk_type,
                    nftContent: nft.nft_content,
                    nftDisplay: nft.nft_display,
                    extractionTimestamp: nft.extraction_timestamp,
                    isActiveCollection: true,
                    collectionMeta: collection,
                    ownershipType: 'kiosk'
                  };
                  onNFTFound?.(verifiedNFT);
                }
              }
            }).catch(error => {
              console.error('Error in kiosk processing:', error);
            });
          }
        }

        // Count all assets found (not just kiosks)
        assetsFound++;
        onProgress?.({ 
          stage: 'kiosk_discovery', 
          message: `Scanning wallet objects...`, 
          current: 0, 
          total: 0,
          assetsFound: assetsFound
        });

        // Add rate limiting delay between object fetches
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing object ${objectId}:`, error);
        // Still count it as found even if it failed
        assetsFound++;
        onProgress?.({ 
          stage: 'kiosk_discovery', 
          message: `Scanning wallet objects...`, 
          current: 0, 
          total: 0,
          assetsFound: assetsFound
        });
      }
    }

    // Add rate limiting delay between pages
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Remove duplicates from kioskAddresses (for return value)
  const uniqueKiosks = [];
  const seenAddresses = new Set();
  for (const kiosk of kioskAddresses) {
    if (!seenAddresses.has(kiosk.kiosk_address)) {
      seenAddresses.add(kiosk.kiosk_address);
      uniqueKiosks.push(kiosk);
    }
  }

  console.log(`Found ${uniqueKiosks.length} unique kiosks`);
  return { kioskAddresses: uniqueKiosks, processedKiosks };
}

/**
 * Get directly owned NFTs from a wallet and process them immediately
 */
async function getDirectlyOwnedNFTs(walletAddress, activeCollections, onProgress = null, onNFTFound = null) {
  console.log(`Finding directly owned NFTs for wallet: ${walletAddress}`);
  
  const directlyOwnedNFTs = [];
  let cursor = null;
  let hasNextPage = true;
  let totalObjectsProcessed = 0;
    
  while (hasNextPage) {
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getOwnedObjects",
      params: [walletAddress, {}, cursor, 50]
    };

    const response = await axios.post(SUI_RPC_ENDPOINT, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data?.result || {};
    const objects = data.data || [];
    hasNextPage = data.hasNextPage || false;
    cursor = data.nextCursor;

    console.log(`Processing ${objects.length} objects from wallet...`);

    // Process each object to find directly owned NFTs
    for (const obj of objects) {
      const objectId = obj.data?.objectId;
      if (!objectId) continue;

      try {
        const objData = await fetchObjectDetails(objectId);
        const objType = objData.type || '';

        // Skip coins and kiosk-related objects
        if (objType.includes('0x2::coin::Coin') || 
            objType.includes('::kiosk::KioskOwnerCap') ||
            objType.includes('PersonalKioskCap') ||
            objType.includes('::kiosk::Kiosk')) {
          continue;
        }

        // Check if this object has an image/media URL (indicating it's likely an NFT)
        const hasImageUrl = (
          objData.display?.image_url ||
          objData.display?.fields?.image_url ||
          objData.display?.fields?.media_url ||
          objData.display?.fields?.url ||
          objData.content?.fields?.image_url ||
          objData.content?.fields?.media_url ||
          objData.content?.fields?.url ||
          objData.content?.image_url ||
          objData.content?.media_url ||
          objData.content?.url
        );

        if (hasImageUrl) {
          console.log(`Found object with image URL: ${objectId} (${objType})`);
          
          const nft = {
            nft_object_id: objectId,
            nft_type: objType,
            kiosk_address: null,
            kiosk_type: 'direct',
            nft_content: objData.content || {},
            nft_display: objData.display || {},
            extraction_timestamp: new Date().toISOString()
          };
          
          directlyOwnedNFTs.push(nft);
          
          // Process this NFT immediately
          const collection = activeCollections.find(c => c.collectionType.trim() === objType.trim());
          if (collection) {
            console.log(`✅ Verified NFT found: ${objectId} matches collection ${collection.name}`);
            const verifiedNFT = {
              objectId: nft.nft_object_id,
              type: nft.nft_type,
              collectionName: collection.name,
              collectionType: collection.collectionType,
              discountPercentage: collection.discount,
              media_url: getNFTImageUrl(nft),
              image_url: getNFTImageUrl(nft),
              name: getNFTName(nft),
              kioskAddress: nft.kiosk_address,
              kioskType: nft.kiosk_type,
              nftContent: nft.nft_content,
              nftDisplay: nft.nft_display,
              extractionTimestamp: nft.extraction_timestamp,
              isActiveCollection: true,
              collectionMeta: collection,
              ownershipType: 'direct'
            };
            onNFTFound?.(verifiedNFT);
          }
        }

        totalObjectsProcessed++;
        onProgress?.({ 
          stage: 'direct_nft_discovery', 
          message: `Scanned ${totalObjectsProcessed} objects for direct NFTs...`, 
          current: totalObjectsProcessed, 
          total: 0,
          assetsFound: totalObjectsProcessed
        });

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing object ${objectId}:`, error);
        totalObjectsProcessed++;
        onProgress?.({ 
          stage: 'direct_nft_discovery', 
          message: `Scanned ${totalObjectsProcessed} objects for direct NFTs...`, 
          current: totalObjectsProcessed, 
          total: 0,
          assetsFound: totalObjectsProcessed
        });
      }
    }

    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`Found ${directlyOwnedNFTs.length} directly owned NFTs`);
  return directlyOwnedNFTs;
}

/**
 * Get all NFTs from a kiosk using dynamic fields
 */
async function getKioskNFTsViaDynamicFields(kioskAddress, kioskType) {
  console.log(`  Examining kiosk: ${kioskAddress}`);
  
  const nfts = [];
  
  try {
    // Get dynamic fields from the kiosk
    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getDynamicFields",
      params: [kioskAddress, null, 100]
    };

    const response = await axios.post(SUI_RPC_ENDPOINT, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data?.result || {};
    const fields = data.data || [];
    
    console.log(`    Found ${fields.length} dynamic fields`);
    
    for (const field of fields) {
      const fieldId = field.objectId;
      if (!fieldId) continue;

      try {
        // Get the actual object
        const objData = await fetchObjectDetails(fieldId);
        const objType = objData.type || '';
        
        // Skip kiosk locks and the kiosk itself
        if (objType.includes('::kiosk::Lock') || 
            objType.includes('::kiosk::Kiosk') ||
            objType.includes('Field<0x2::kiosk::Lock')) {
          continue;
        }
        
        // This is an actual NFT
        console.log(`    Found NFT: ${fieldId} (${objType})`);
        console.log(`    Raw NFT data from Sui RPC:`, {
          content: objData.content,
          display: objData.display,
          type: objData.type
        });
        
        nfts.push({
          nft_object_id: fieldId,
          nft_type: objType,
          kiosk_address: kioskAddress,
          kiosk_type: kioskType,
          nft_content: objData.content || {},
          nft_display: objData.display || {},
          extraction_timestamp: new Date().toISOString()
        });
        
        // Add rate limiting delay between NFT fetches
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`    Error getting object ${fieldId}:`, error);
      }
    }
    
    console.log(`    Total NFTs found in kiosk: ${nfts.length}`);
    return nfts;
    
  } catch (error) {
    console.error(`    Error examining kiosk ${kioskAddress}:`, error);
    return nfts;
  }
}

// ============================================================================
// NFT METADATA EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Extract NFT image URL from NFT metadata (content/display)
 */
function getNFTImageUrl(nft) {
  // Helper function to convert IPFS URLs to gateway format
  const convertIpfsUrl = (url) => {
    if (!url) return null;
    
    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's an IPFS URL with ipfs:// prefix
    if (url.startsWith('ipfs://')) {
      const ipfsHash = url.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    // If it's just an IPFS hash (like "bafybeign3mei274odlrwh6j5yb3ggi6lsx6pn2zhw6cahhm36kjjfvhl6a")
    if (url.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{55})$/)) {
      return `https://ipfs.io/ipfs/${url}`;
    }
    
    // If it's not an IPFS URL, return it as is.
    return url;
  };

  // Try multiple possible locations for image URLs
  const possibleImageFields = [
    // Display fields
    nft.nft_display?.image_url,
    nft.nft_display?.fields?.image_url,
    nft.nft_display?.fields?.media_url,
    nft.nft_display?.fields?.url,
    
    // Content fields
    nft.nft_content?.fields?.image_url,
    nft.nft_content?.fields?.media_url,
    nft.nft_content?.fields?.url,
    
    // Direct content fields
    nft.nft_content?.image_url,
    nft.nft_content?.media_url,
    nft.nft_content?.url,
  ];

  for (const field of possibleImageFields) {
    if (field) {
      const imageUrl = convertIpfsUrl(field);
      if (imageUrl) {
        return imageUrl;
      }
    }
  }
  
  return null;
}

/**
 * Extract NFT name from NFT metadata (content/display)
 */
function getNFTName(nft) {
  console.log(`🔍 Extracting name for NFT: ${nft.nft_object_id}`);
  console.log(`   NFT display data:`, nft.nft_display);
  console.log(`   NFT content data:`, nft.nft_content);
  console.log(`   NFT content fields:`, nft.nft_content?.fields);
  console.log(`   NFT display fields:`, nft.nft_display?.fields);
  
  // Try multiple possible locations for names
  const possibleNameFields = [
    // Display fields
    nft.nft_display?.name,
    nft.nft_display?.fields?.name,
    
    // Content fields
    nft.nft_content?.fields?.name,
    nft.nft_content?.name,
    
    // Display data fields
    nft.nft_display?.data?.name,
  ];

  for (const field of possibleNameFields) {
    if (field) {
      console.log(`   ✅ Found name: ${field}`);
      return field;
    }
  }
  
  const fallbackName = `NFT ${nft.nft_object_id?.slice(0, 8) || nft.address?.slice(0, 8)}...`;
  console.log(`   ❌ No name found, using fallback: ${fallbackName}`);
  return fallbackName;
}

// ============================================================================
// MAIN ORCHESTRATION FUNCTIONS
// ============================================================================

/**
 * Process a single kiosk and return its NFTs
 */
async function processSingleKiosk(kioskInfo, onProgress = null) {
  const kioskAddress = kioskInfo.kiosk_address;
  const kioskType = kioskInfo.kiosk_type;
  
  console.log(`Processing kiosk: ${kioskAddress} (${kioskType})`);
  
  const nfts = await getKioskNFTsViaDynamicFields(kioskAddress, kioskType);
  
      return {
    kiosk_address: kioskAddress,
    kiosk_type: kioskType,
    nfts: nfts,
    total_nfts: nfts.length,
    extraction_timestamp: new Date().toISOString()
  };
}

/**
 * Main function: verify user's NFTs with real-time feedback - NON-BLOCKING VERSION
 * @param {string} walletAddress
 * @param {boolean} forceRefresh - If true, will also refresh the active collections cache.
 * @param {function} onProgress - Callback function for progress updates
 * @param {function} onNFTFound - Callback function when a verified NFT is found
 * @returns {Promise<{success: boolean, verifiedNFTs: Array, isNFTVerified: boolean, activeCollections: Array, error?: string}>}
 */
async function checkUserNFTs(walletAddress, forceRefresh = false, onProgress = null, onNFTFound = null) {
  try {
    onProgress?.({ stage: 'starting', message: 'Starting verification...', current: 0, total: 1 });

    // 1. Get collections first
    const activeCollections = await getActiveCollections(forceRefresh);
    
    // 2. Start the real-time analysis in the background
    // Don't await it - let it run and call callbacks
    startRealTimeNFTAnalysis(walletAddress, activeCollections, onProgress, onNFTFound);
    
    // 3. Return immediately - the analysis will continue in background
    return {
      success: true,
      verifiedNFTs: [], // Will be populated via onNFTFound callback
      isNFTVerified: false, // Will be updated via onNFTFound callback
      activeCollections: activeCollections
    };

  } catch (error) {
    console.error("Error during checkUserNFTs:", error);
    return {
      success: false,
      verifiedNFTs: [],
      isNFTVerified: false,
      activeCollections: await getActiveCollections(),
      error: error.message 
    };
  }
}

/**
 * Start real-time NFT analysis - completely non-blocking
 */
function startRealTimeNFTAnalysis(walletAddress, activeCollections, onProgress = null, onNFTFound = null) {
  console.log(`Starting real-time NFT analysis for wallet: ${walletAddress}`);
  
  // Start kiosk discovery immediately
  getWalletKioskAddresses(walletAddress, activeCollections, onProgress, onNFTFound)
    .catch(error => console.error('Error in kiosk discovery:', error));
  
  // Start direct NFT discovery immediately  
  getDirectlyOwnedNFTs(walletAddress, activeCollections, onProgress, onNFTFound)
    .catch(error => console.error('Error in direct NFT discovery:', error));
  
  console.log('Both discovery processes started - NFTs will appear in real-time');
}

// ============================================================================
// EXPORTS
// ============================================================================

const NFTVerifier = {
  checkUserNFTs,
  getNFTImageUrl,
  getNFTName,
  startRealTimeNFTAnalysis
};
export default NFTVerifier; 