#!/usr/bin/env python3
"""
NFT Verifier Script

This script verifies a wallet's NFTs and compares them to active NFT collections from the database.
It uses the Indexer API and AYA API to fetch and verify NFTs.
"""

import requests
import json
import argparse
from typing import Dict, List, Any, Optional
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import re
from difflib import SequenceMatcher

# Constants
INDEXER_API_ENDPOINT = 'https://api.indexer.xyz/graphql'
INDEXER_HEADERS = {
    'Content-Type': 'application/json',
    'x-api-user': 'ayastudios',
    'x-api-key': 'SInxZyO.2a750dc7c138defad149a45e7f9abbf3'
}
AYA_API_ROOT = 'https://api.ayastudios.com'

# Create a session with retry mechanism
def create_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

# Cache for NFT data to avoid excessive API calls
class NFTCache:
    def __init__(self):
        self.collections = {
            'data': None,
            'last_fetched': 0,
            'ttl': 24 * 60 * 60  # 24 hours TTL for collections
        }
        self.nfts = {}
        self.holders = {}
        self.wallet_nfts = {}  # Cache for wallet NFTs including kiosk NFTs
        self.ttl = 5 * 60  # 5 minutes TTL for NFTs and holders
    
    def get_collections(self):
        """Get cached collections if they're still valid"""
        now = time.time()
        if self.collections['data'] and (now - self.collections['last_fetched'] < self.collections['ttl']):
            print(f"Using {len(self.collections['data'])} cached active collections")
            return self.collections['data']
        return None
    
    def set_collections(self, data):
        """Set collections in cache"""
        self.collections['data'] = data
        self.collections['last_fetched'] = time.time()
        print(f"Cached {len(data)} active collections")
    
    def get_wallet_nfts(self, wallet_address):
        """Get wallet NFTs from cache"""
        if wallet_address in self.wallet_nfts:
            cached_data = self.wallet_nfts[wallet_address]
            now = time.time()
            if now - cached_data['timestamp'] < self.ttl:
                print(f"Using cached NFTs for wallet {wallet_address}")
                return cached_data['data']
        return None
    
    def set_wallet_nfts(self, wallet_address, data):
        """Set wallet NFTs in cache"""
        self.wallet_nfts[wallet_address] = {
            'data': data,
            'timestamp': time.time()
        }
        print(f"Cached NFTs for wallet {wallet_address}")
    
    def clear_collections(self):
        """Clear collections cache"""
        self.collections['data'] = None
        print("Cleared collections cache")
    
    def clear_all(self):
        """Clear all caches"""
        self.clear_collections()
        self.nfts.clear()
        self.holders.clear()
        self.wallet_nfts.clear()
        print("Cleared all caches")

# Initialize cache
nft_cache = NFTCache()

def similar(a, b):
    """Return similarity ratio between two strings"""
    return SequenceMatcher(None, a, b).ratio()

def verify_nfts(nfts, active_collections):
    verified_nfts = []
    
    for nft in nfts:
        print("\nNFT Details:")
        print(f"- Token ID: {nft.get('token_id', 'Unknown')}")
        print(f"- Name: {nft.get('name', 'Unknown')}")
        print(f"- Collection ID: {nft.get('collection_id', 'Unknown')}")
        print(f"- Media URL: {nft.get('media_url', '')}")
        print(f"- NFT Type/Package: {nft.get('type', 'Unknown')}")

        matched = False
        for collection in active_collections:
            print(f"\nComparing against collection: {collection['name']}")
            print(f"  - Collection type: {collection['collectionType']}")
            print(f"  - NFT type: {nft.get('type', '')}")
            
            # Extract collection name without spaces and lowercase
            collection_name_normalized = collection['name'].lower().replace(' ', '')
            nft_name_normalized = nft.get('name', '').lower().replace(' ', '')
            
            # Check if NFT name contains collection name or vice versa
            name_match = collection_name_normalized in nft_name_normalized or nft_name_normalized in collection_name_normalized
            
            # Check for fuzzy match if exact match fails
            if not name_match:
                similarity = similar(collection_name_normalized, nft_name_normalized)
                if similarity > 0.8:  # 80% similarity threshold
                    print(f"  - Similarity score: {similarity:.2f}")
                    name_match = True
            
            # Extract package IDs
            collection_package = collection['collectionType'].split('::')[0].replace('0x', '').lower()
            nft_package = nft.get('type', '').replace('0x', '').lower()
            
            print(f"  - Collection package: {collection_package}")
            print(f"  - NFT package: {nft_package}")
            
            # Check for matches
            if name_match or collection_package == nft_package:
                match_type = 'name' if name_match else 'package'
                print(f"  ✓ {match_type.capitalize()} match!")
                matched = True
                verified_nfts.append({
                    'nft': nft,
                    'collection': collection,
                    'match_type': match_type
                })
                break
            else:
                print("  × No match")
                
    print(f"\nFound {len(verified_nfts)} verified NFTs from active collections")
    return verified_nfts

def fetch_active_collections():
    """Fetch active collections from the local server."""
    try:
        # Use the local server endpoint
        url = "http://localhost:6969/api/sui/collections/active"
        print(f"Attempting to fetch collections from {url}")
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        collections = response.json()
        print(f"Found {len(collections)} collections")
        print(f"Collections response: {json.dumps(collections, indent=2)}")
        
        # Cache the collections
        global _collections_cache
        _collections_cache = collections
        
        return collections
    except Exception as e:
        print(f"Error fetching collections: {str(e)}")
        return []

def fetch_wallet_nfts(wallet_address: str) -> List[Dict[str, Any]]:
    """
    Fetch NFTs owned by a specific wallet, including those in kiosks
    
    Args:
        wallet_address: The wallet address to query
        
    Returns:
        List of NFTs owned by the wallet
    """
    # Check cache first
    cached_nfts = nft_cache.get_wallet_nfts(wallet_address)
    if cached_nfts:
        return cached_nfts
    
    try:
        # Create a session with retry mechanism
        session = create_session()
        
        # Get all NFTs owned by the wallet using wallet_holdings
        query = """
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
        """

        print(f"Fetching NFTs for wallet {wallet_address}")
        response = session.post(
            INDEXER_API_ENDPOINT,
            headers=INDEXER_HEADERS,
            json={
                'query': query,
                'variables': {
                    'walletAddress': wallet_address
                }
            },
            timeout=10
        )

        if not response.ok:
            print(f"Error fetching wallet NFTs: API returned status code {response.status_code}")
            print(f"Response text: {response.text}")
            return []

        result = response.json()
        print(f"API Response: {json.dumps(result, indent=2)}")
        
        if not result or 'data' not in result or 'sui' not in result['data'] or 'wallet_holdings' not in result['data']['sui']:
            print("Error fetching wallet NFTs: Invalid response format")
            return []
            
        wallet_holdings = result['data']['sui']['wallet_holdings']
        print(f"Found {len(wallet_holdings)} NFTs in wallet {wallet_address}")

        # Format wallet NFTs
        formatted_wallet_nfts = []
        for holding in wallet_holdings:
            if 'nft' in holding:
                nft = holding['nft']
                # Use token_id as the type since it contains the package ID
                formatted_wallet_nfts.append({
                    'token_id': nft.get('token_id'),
                    'collection_id': nft.get('collection_id'),
                    'name': nft.get('name', 'Unknown NFT'),
                    'media_url': nft.get('media_url', ''),
                    'type': nft.get('token_id', '')  # Use token_id as the type
                })

        print(f"Found {len(formatted_wallet_nfts)} total NFTs in wallet")
        
        # Cache the results
        nft_cache.set_wallet_nfts(wallet_address, formatted_wallet_nfts)
        
        return formatted_wallet_nfts
    except requests.exceptions.Timeout:
        print("Error fetching wallet NFTs: Request timed out")
        return []
    except requests.exceptions.ConnectionError:
        print("Error fetching wallet NFTs: Connection error")
        return []
    except Exception as error:
        print(f"Error fetching wallet NFTs: {error}")
        return []

def check_user_nfts(wallet_address: str, api_base_url: str) -> Dict[str, Any]:
    """
    Check user NFTs against active collections
    
    Args:
        wallet_address: User's wallet address
        api_base_url: Base URL for the AYA API
        
    Returns:
        Results of NFT check
    """
    print(f"=== CHECKING USER NFTS FOR {wallet_address} ===")
    
    if not wallet_address:
        print("No wallet address provided")
        return {'nfts': [], 'verified': False, 'activeCollections': []}
    
    try:
        # First get all NFTs owned by the wallet (including those in kiosks)
        print("Fetching all NFTs owned by wallet (directly and in kiosks)...")
        wallet_nfts = fetch_wallet_nfts(wallet_address)
        print(f"Found {len(wallet_nfts)} total NFTs owned by wallet")
        
        # Fetch active collections
        active_collections = fetch_active_collections()
        print(f"Checking against {len(active_collections)} active collections")
        
        verified_nfts = verify_nfts(wallet_nfts, active_collections)
        
        print(f"Found {len(verified_nfts)} verified NFTs from active collections")
        
        return {
            'nfts': verified_nfts,
            'verified': len(verified_nfts) > 0,
            'activeCollections': active_collections
        }
    except Exception as error:
        print(f"Error checking user NFTs: {error}")
        return {'nfts': [], 'verified': False, 'activeCollections': []}

def clear_all_nft_caches():
    """Clear all NFT caches"""
    nft_cache.clear_all()

def clear_nft_cache_for_wallet(address: str):
    """
    Clear wallet-specific NFT cache
    
    Args:
        address: Wallet address to clear cache for
    """
    if address in nft_cache.wallet_nfts:
        del nft_cache.wallet_nfts[address]
        print(f"Cleared cache for wallet {address}")

def main():
    """Main function to run the script"""
    parser = argparse.ArgumentParser(description='Verify a wallet\'s NFTs against active collections')
    parser.add_argument('wallet_address', help='Wallet address to check')
    parser.add_argument('--api-base-url', default='https://api.ayastudios.com', help='Base URL for the AYA API')
    parser.add_argument('--clear-cache', action='store_true', help='Clear all NFT caches before running')
    parser.add_argument('--output', help='Output file to save results (JSON format)')
    parser.add_argument('--use-mock-data', action='store_true', help='Use mock data for testing when API is not available')
    
    args = parser.parse_args()
    
    if args.clear_cache:
        clear_all_nft_caches()
    
    # Use mock data if requested
    if args.use_mock_data:
        print("Using mock data for testing...")
        mock_results = {
            'nfts': [
                {
                    'id': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                    'type': '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690::everyone_will_cry__::Nft',
                    'name': 'AYA Pass #1',
                    'collectionName': 'Aya Pass',
                    'collectionType': '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690::everyone_will_cry__::Nft',
                    'discountPercentage': 50,
                    'image_url': 'https://example.com/aya-pass-1.png',
                    'in_kiosk': False,
                    'verified': True
                },
                {
                    'id': '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef',
                    'type': '0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::avatar::Avatar',
                    'name': 'Avatar NFT #1',
                    'collectionName': 'Avatar Collection',
                    'collectionType': '0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::avatar::Avatar',
                    'discountPercentage': 30,
                    'image_url': 'https://example.com/avatar-1.png',
                    'in_kiosk': True,
                    'kiosk_id': '0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef',
                    'verified': True
                }
            ],
            'verified': True,
            'activeCollections': [
                {
                    'name': 'Aya Pass',
                    'collectionType': '0x918da6cc0a4d17b2d26b8688eea018dda023aa90a5b04df89779dabe02a64690::everyone_will_cry__::Nft',
                    'discountPercentage': 50
                },
                {
                    'name': 'Avatar Collection',
                    'collectionType': '0x75cab45b9cba2d0b06a91d1f5fa51a4569da07374cf42c1bd2802846a61efe33::avatar::Avatar',
                    'discountPercentage': 30
                }
            ]
        }
        results = mock_results
    else:
        results = check_user_nfts(args.wallet_address, args.api_base_url)
    
    # Print results
    print("\n=== RESULTS ===")
    print(f"Wallet: {args.wallet_address}")
    print(f"Verified: {results['verified']}")
    print(f"Verified NFTs: {len(results['nfts'])}")
    
    if results['nfts']:
        print("\nVerified NFTs:")
        for nft in results['nfts']:
            name = nft.get('name', 'Unknown NFT')
            nft_id = nft.get('token_id', 'Unknown ID')
            collection = nft.get('collection', 'Unknown Collection')
            print(f"  - {name} (ID: {nft_id})")
            print(f"    Collection: {collection}")
            print(f"    Match Type: {nft.get('match_type', 'Unknown')}")
            print()
    
    # Save results to file if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main() 