# Solana Launchpad DEX

A decentralized exchange (DEX) and launchpad platform built on Solana, featuring a bonding curve mechanism for token sales.

## Features

- **Token Creation**: Create new SPL tokens with metadata
- **Bonding Curve**: Automatic price discovery mechanism
- **Buy/Sell Interface**: User-friendly interface for token trading
- **Real-time Balance**: Track your token balance
- **Pool Information**: View detailed information about the bonding curve pool

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Blockchain**: Solana (Devnet)
- **Smart Contracts**: Anchor Framework
- **Token Standard**: Solana Program Library (SPL)
- **Wallet Integration**: Solana Wallet Adapter (Phantom, Solflare, Backpack)

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Solana CLI (optional, for deployment)
- A Solana wallet (Phantom recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/sagarregmi2056/solana-launchpad-dex.git
   cd solana-launchpad-dex
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Smart Contract Deployment

The smart contract is already deployed to Solana Devnet at address: `ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4`

If you want to deploy your own version:

1. Build the Anchor program:
   ```bash
   anchor build
   ```

2. Deploy to Solana Devnet:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

3. Update the `PROGRAM_ID` in `utils/anchorClient.js` with your new program ID

## Usage Guide

### Creating a Token (Admin)

1. Connect your wallet
2. Navigate to the "Create Token" tab
3. Fill in the token details:
   - Token Name
   - Token Symbol
   - Initial Price (in SOL)
   - Price Slope (in SOL)
4. Click "Create Token"
5. Approve the transaction in your wallet

### Buying Tokens

1. Connect your wallet
2. Navigate to the "Buy Tokens" tab
3. Enter the amount of tokens you want to buy
4. Review the estimated cost
5. Click "Buy Tokens"
6. Approve the transaction in your wallet

### Selling Tokens

1. Connect your wallet
2. Navigate to the "Sell Tokens" tab
3. Enter the amount of tokens you want to sell
4. Click "Sell Tokens"
5. Approve the transaction in your wallet

## How Bonding Curves Work

A bonding curve is a mathematical curve that defines the relationship between a token's price and its supply. In this application:

- The price increases as more tokens are purchased (positive slope)
- The price decreases as tokens are sold back to the curve
- The formula used is: `Price = InitialPrice + (Slope * Supply)`

This creates a fair and transparent pricing mechanism that automatically adjusts based on demand.

## License

MIT License

## Contact

For questions or support, please open an issue on the GitHub repository or contact the development team.
