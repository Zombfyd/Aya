# NFT Verifier Script

This Python script verifies a wallet's NFTs and compares them to active NFT collections from the database. It uses the Indexer API and AYA API to fetch and verify NFTs.

## Features

- Fetches NFTs owned by a wallet (both directly and in kiosks)
- Fetches active NFT collections from the database
- Verifies NFTs against active collections
- Special handling for AYA Pass NFTs
- Caching to avoid excessive API calls
- Command-line interface with various options

## Requirements

- Python 3.6+
- `requests` library

## Installation

1. Clone this repository or download the script
2. Install the required dependencies:

```bash
pip install requests
```

## Usage

Basic usage:

```bash
python nft_verifier.py <wallet_address>
```

### Command-line Options

- `wallet_address`: The wallet address to check (required)
- `--api-base-url`: Base URL for the AYA API (default: https://api.ayastudios.com)
- `--clear-cache`: Clear all NFT caches before running
- `--output`: Output file to save results (JSON format)

### Examples

Check a wallet's NFTs:

```bash
python nft_verifier.py 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

Check a wallet's NFTs and save results to a file:

```bash
python nft_verifier.py 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --output results.json
```

Check a wallet's NFTs with a custom API base URL:

```bash
python nft_verifier.py 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --api-base-url https://api.example.com
```

Clear cache and check a wallet's NFTs:

```bash
python nft_verifier.py 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --clear-cache
```

## Output

The script outputs the following information:

- Wallet address
- Whether the wallet has verified NFTs
- Number of verified NFTs
- Details of each verified NFT:
  - Name
  - ID
  - Collection name
  - Discount percentage
  - Type
  - Whether it's in a kiosk
  - Kiosk ID (if applicable)

If the `--output` option is specified, the results are also saved to a JSON file.

## How It Works

1. The script fetches all NFTs owned by the specified wallet, including those in kiosks.
2. It fetches active NFT collections from the database.
3. It verifies each NFT against the active collections by checking:
   - Exact type matches
   - Package matches (first part of the type)
   - Special handling for AYA Pass NFTs
4. It outputs the results to the console and optionally to a file.

## Caching

The script implements caching to avoid excessive API calls:

- Collections are cached for 24 hours
- Wallet NFTs are cached for 5 minutes
- Cache can be cleared with the `--clear-cache` option

## Troubleshooting

If you encounter issues:

1. Make sure you have the required dependencies installed
2. Check that the wallet address is correct
3. Verify that the API base URL is accessible
4. Try clearing the cache with the `--clear-cache` option
5. Check the error messages for more information 