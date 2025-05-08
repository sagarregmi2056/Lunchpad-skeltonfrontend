import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../components/Layout';
import UserTokens from '../components/UserTokens';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function MyTokensPage() {
  const { publicKey } = useWallet();

  return (
    <Layout title="My Tokens">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">My Created Tokens</h1>
        
        {!publicKey ? (
          <div className="text-center">
            <p className="mb-4">Connect your wallet to view your tokens</p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        ) : (
          <UserTokens />
        )}
        
        <div className="mt-8 bg-gray-900 rounded-xl p-6 mx-auto max-w-4xl">
          <h2 className="text-xl font-bold mb-4 text-white">About Bonding Curve</h2>
          <div className="text-gray-300 space-y-3">
            <p>
              This platform uses a shared bonding curve for all tokens. The bonding curve determines the price of tokens based on supply.
            </p>
            <p>
              <span className="font-medium text-blue-400">How it works:</span> The price follows the formula <code className="bg-gray-800 px-2 py-1 rounded">Price = InitialPrice + (TotalSupply * Slope)</code>
            </p>
            <p>
              When you create a token, you're actually creating a new SPL token that uses the platform's shared bonding curve mechanism for pricing.
            </p>
            <p>
              You can view your created tokens on the Solana Explorer to see details about ownership, supply, and other on-chain information.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
} 