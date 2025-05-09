import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../components/Layout';
import UserTokens from '../components/UserTokens';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

export default function MyTokensPage() {
  const { publicKey } = useWallet();

  return (
    <Layout title="CurveLaunch | My Tokens">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Created Tokens</h1>
          <Link 
            href="/app" 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:shadow-purple-700/20 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Trade Tokens
          </Link>
        </div>
        
        {!publicKey ? (
          <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-md p-12 rounded-xl border border-purple-800/30 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-purple-400 mx-auto mb-4">
              <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
              <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
            </svg>
            <p className="text-xl font-medium text-white mb-6">Connect your wallet to view your tokens</p>
            <div className="flex justify-center">
              <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg text-md shadow-lg hover:shadow-purple-700/20 transition" />
            </div>
          </div>
        ) : (
          <UserTokens />
        )}
        
        <div className="mt-12 bg-gradient-to-br from-gray-800/40 to-purple-900/20 backdrop-blur-md p-8 rounded-xl border border-purple-900/30 shadow-lg">
          <h2 className="text-xl font-bold mb-4 text-white">About CurveLaunch Bonding Curves</h2>
          <div className="text-gray-300 space-y-3">
            <p>
              CurveLaunch uses bonding curves to determine token prices based on supply, creating an automatic price discovery mechanism.
            </p>
            <p>
              <span className="font-medium text-purple-400">How it works:</span> The price follows the formula <code className="bg-gray-800 px-2 py-1 rounded">Price = InitialPrice + (TotalSupply * Slope)</code>
            </p>
            <p>
              When you create a token, you're creating a new SPL token that uses our bonding curve mechanism for pricing. This ensures your token is always liquid and tradeable.
            </p>
            <p>
              Each token you create can be viewed on the Solana Explorer and shared with your community to start building a following.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
} 