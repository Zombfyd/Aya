# NFT Utilities

This module provides utilities for working with NFTs and kiosks on the Sui blockchain in the Aya platform.

## Overview

The `nftUtils.js` file contains functions for:

- Checking NFTs owned by a user
- Verifying ownership of specific NFT collections
- Querying collection information
- Formatting IPFS URLs
- Getting detailed NFT information
- Finding user kiosks and their contents
- Combined verification of directly owned NFTs and kiosk items

## Usage Examples

### Basic Usage

```javascript
import nftUtils from '../utils/nftUtils';
// or import specific functions
import { checkUserNFTs, formatIPFSUrl, getAllUserKioskItems, checkUserNFTsAndKiosk } from '../utils/nftUtils';

// Check user's directly owned NFTs
const { verifiedNFTs, isNFTVerified, activeCollections } = await nftUtils.checkUserNFTs(suiClient, wallet);

// Format an IPFS URL
const formattedUrl = nftUtils.formatIPFSUrl('ipfs://QmXyZ123...');

// Get all kiosk items
const kioskItems = await nftUtils.getAllUserKioskItems(suiClient, walletAddress);

// Check both directly owned NFTs and kiosk items in one call
const combinedResults = await nftUtils.checkUserNFTsAndKiosk(suiClient, wallet);
```

### Checking NFTs

To check all NFTs owned by a user across all active collections:

```javascript
const checkNFTs = async () => {
  const nftResults = await nftUtils.checkUserNFTs(suiClient, wallet);
  
  if (nftResults.isNFTVerified) {
    console.log(`User has ${nftResults.verifiedNFTs.length} verified NFTs`);
    // Do something with the verified NFTs
  } else {
    console.log('User has no verified NFTs');
  }
  
  return nftResults;
};
```

### Combined NFT & Kiosk Checking

To check both directly owned NFTs and kiosk items against active collections:

```javascript
const checkAllNFTs = async () => {
  const results = await nftUtils.checkUserNFTsAndKiosk(suiClient, wallet);
  
  console.log(`Found ${results.verifiedNFTs.length} total verified NFTs`);
  
  // Separate direct NFTs from kiosk items if needed
  const directNFTs = results.verifiedNFTs.filter(nft => !nft.in_kiosk);
  const kioskNFTs = results.verifiedNFTs.filter(nft => nft.in_kiosk);
  
  console.log(`Direct NFTs: ${directNFTs.length}`);
  console.log(`NFTs in kiosks: ${kioskNFTs.length}`);
  
  return results;
};
```

### Checking Specific Collections

You can check NFTs in a specific collection:

```javascript
const collection = {
  collectionType: "0x123...::collection::NFT",
  name: "Example Collection"
};

const collectionNFTs = await nftUtils.checkCollectionNFTs(
  suiClient, 
  wallet.account.address, 
  collection
);
```

### Checking Specific NFT Ownership

Check if a user owns any NFT of a specific type:

```javascript
const hasNFT = await nftUtils.checkSpecificNFTOwnership(
  suiClient,
  wallet.account.address,
  "0x123...::collection::NFT"
);

if (hasNFT) {
  // User owns at least one NFT of this type
}
```

### Working with Kiosks

Find all kiosks owned by a user:

```javascript
const kiosks = await nftUtils.findUserKiosks(suiClient, walletAddress);
console.log(`User has ${kiosks.length} kiosks`);
```

Get items from a specific kiosk:

```javascript
const kioskId = "0x123..."; // ID of the kiosk
const items = await nftUtils.getKioskItems(suiClient, kioskId);
console.log(`Kiosk contains ${items.length} items`);
```

Get all items from all kiosks owned by a user:

```javascript
const allKioskItems = await nftUtils.getAllUserKioskItems(suiClient, walletAddress);
console.log(`Found ${allKioskItems.length} items across all user kiosks`);

// Display item information
allKioskItems.forEach(item => {
  console.log(`Item: ${item.name}`);
  console.log(`Type: ${item.type}`);
  console.log(`Image: ${item.image_url}`);
});
```

Check if a user has a specific item type in any of their kiosks:

```javascript
const hasItem = await nftUtils.checkItemInKiosks(
  suiClient,
  walletAddress,
  "0x123...::collection::NFT"
);

if (hasItem) {
  // User has at least one item of this type in their kiosks
}
```

### Matching Kiosk Items to Collections

Match kiosk items against active collections:

```javascript
const activeCollections = await nftUtils.fetchActiveCollections();
const kioskItems = await nftUtils.getAllUserKioskItems(suiClient, walletAddress);

// Match kiosk items to active collections
const verifiedKioskItems = nftUtils.matchKioskItemsToCollections(kioskItems, activeCollections);

console.log(`Found ${verifiedKioskItems.length} kiosk items that match active collections`);
```

## API Reference

### NFT Functions

### `formatIPFSUrl(url)`
Converts IPFS URLs to HTTP gateway URLs.

### `getNFTDetails(client, objectId)`
Gets detailed information about a specific NFT by its object ID.

### `queryChillCatsNFTs(client, address)`
Queries ChillCats NFTs owned by a specific address.

### `checkCollectionNFTs(client, address, collection)`
Checks for NFTs in a specific collection owned by an address.

### `fetchActiveCollections()`
Fetches active collections from the API.

### `checkUserNFTs(client, wallet)`
Checks all NFTs owned by a user across active collections.

### `checkSpecificNFTOwnership(client, address, structType)`
Checks if a user owns any NFT of a specific type.

### Kiosk Functions

### `findUserKiosks(client, address)`
Finds all kiosks owned by a wallet address.

### `getKioskItems(client, kioskId)`
Gets all items inside a specific kiosk.

### `getAllUserKioskItems(client, address)`
Gets all items from all kiosks owned by a user.

### `checkItemInKiosks(client, address, structType)`
Checks if a specific item exists in any of the user's kiosks.

### Combined Functions

### `matchKioskItemsToCollections(kioskItems, activeCollections)`
Matches kiosk items against active collections and formats them like verified NFTs.

### `checkUserNFTsAndKiosk(client, wallet)`
Enhanced version of checkUserNFTs that checks both directly owned NFTs and kiosk items. 