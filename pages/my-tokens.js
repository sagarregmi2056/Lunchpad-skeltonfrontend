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
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-2">
            Tokens you create are stored locally in your browser and linked to your wallet address.
          </p>
          <p className="text-sm text-gray-400">
            Click on "View Token" to see your token on the Solana Explorer.
          </p>
        </div>
      </div>
    </Layout>
  );
} 