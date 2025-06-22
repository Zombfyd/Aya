# Aya Game - NFT Verification System

A web-based game with integrated NFT verification for Sui blockchain kiosks.

## Project Structure

```
/
├── src/
│   ├── components/
│   │   └── GameApp.jsx
│   ├── game/
│   │   └── GameManager.js
│   ├── config/
│   │   └── config.js
│   ├── utils/
│   │   └── NFTVerifier.js      # Updated NFT verification system
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── scripts/                    # Analysis scripts (gitignored)
│   └── kiosk_analysis/         # Kiosk and NFT analysis tools
├── index.html
├── vite.config.js
├── package.json
└── .env.development
```

## NFT Verification System

The project includes an enhanced NFT verification system that properly handles Sui kiosks:

### Key Features
- **Dynamic Fields Support**: Correctly finds NFTs stored as dynamic fields in kiosks
- **Kiosk Detection**: Identifies both standard and personal kiosks owned by wallets
- **Active Collection Matching**: Compares NFTs against backend active collections
- **Comprehensive Logging**: Detailed console output for debugging

### Usage
```javascript
import NFTVerifier from './src/utils/NFTVerifier.js';

const result = await NFTVerifier.checkUserNFTs(walletAddress);
if (result.hasActiveCollectionNFT) {
  console.log('User has active collection NFT!');
}
```

## Development Scripts

Analysis scripts are located in `/scripts/kiosk_analysis/` (gitignored):
- Kiosk data extraction tools
- NFT analysis scripts
- Debug and testing utilities
- Comprehensive documentation

See `/scripts/kiosk_analysis/README.md` for detailed information.

## Setup

1. Install dependencies: `npm install`
2. Set up environment variables
3. Run development server: `npm run dev`

## Technologies

- **Frontend**: React + Vite
- **Blockchain**: Sui SDK
- **NFT Verification**: Custom dynamic fields approach
- **Analysis**: Python + aiohttp
