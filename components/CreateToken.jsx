import { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTokenWithMetadata } from '../utils/createToken';
import { initializeBondingCurve } from '../utils/anchorClient';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { IconCoin, IconInfo, IconSuccess, IconError, LoadingSpinner } from './Icons';

const CreateToken = () => {
    const [loading, setLoading] = useState(false);
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [initialPrice, setInitialPrice] = useState('1');
    const [slope, setSlope] = useState('0.1');
    const [status, setStatus] = useState('');
    const [mounted, setMounted] = useState(false);

    // Use the wallet adapter hook
    const { publicKey, disconnect, signTransaction, signMessage, signAllTransactions } = useWallet();

    // Handle wallet adapter hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleCreateToken = async () => {
        try {
            if (!publicKey) {
                throw new Error('Wallet not connected');
            }

            if (!tokenName || !tokenSymbol || !initialPrice || !slope) {
                throw new Error('Please fill in all fields');
            }

            if (isNaN(initialPrice) || parseFloat(initialPrice) <= 0) {
                throw new Error('Initial price must be a positive number');
            }

            if (isNaN(slope) || parseFloat(slope) <= 0) {
                throw new Error('Slope must be a positive number');
            }

            setLoading(true);
            setStatus('Creating token...');

            const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

            // Create a wallet adapter object with the necessary methods
            const wallet = {
                publicKey: publicKey,
                signTransaction: signTransaction,
                signMessage: signMessage,
                signAllTransactions: signAllTransactions
            };

            // Configuration object for createTokenWithMetadata
            const tokenConfig = {
                decimals: 9,
                name: tokenName,
                symbol: tokenSymbol,
                uri: '',
            };

            console.log('Token Config:', tokenConfig);

            const result = await createTokenWithMetadata(
                connection,
                wallet,
                tokenConfig
            );

            if (result.success) {
                setStatus('Token created. Initializing bonding curve...');

                // Convert price and slope to lamports
                const priceInLamports = parseFloat(initialPrice) * LAMPORTS_PER_SOL;
                const slopeInLamports = parseFloat(slope) * LAMPORTS_PER_SOL;

                // Initialize the bonding curve
                const tx = await initializeBondingCurve(
                    wallet,
                    priceInLamports,
                    slopeInLamports
                );

                setStatus(`Token created and initialized successfully!\nMint address: ${result.mint}\nTransaction: ${tx}`);
                setTokenName('');
                setTokenSymbol('');
                setInitialPrice('1');
                setSlope('0.1');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error creating token:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 text-gray-200">
            <div className="flex items-center mb-2">
                <IconCoin className="h-5 w-5 mr-2 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Token Creation (Admin)</h2>
            </div>
            <p className="text-gray-400 text-sm">Create a new token with metadata and initialize its bonding curve.</p>

            {!mounted ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="lg" color="indigo" />
                </div>
            ) : !publicKey ? (
                <div className="flex justify-center py-6">
                    <div className="wallet-button-wrapper">
                        <WalletMultiButton />
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="bg-gray-800 rounded-lg p-3.5 border border-gray-700">
                        <p className="text-xs text-gray-400">Admin Wallet</p>
                        <p className="text-gray-300 font-mono text-xs truncate">{publicKey.toString()}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="tokenName" className="block text-sm font-medium text-gray-300">
                                Token Name
                            </label>
                            <input
                                id="tokenName"
                                type="text"
                                value={tokenName}
                                onChange={(e) => setTokenName(e.target.value)}
                                placeholder="Enter token name"
                                className="mt-1 block w-full px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="tokenSymbol" className="block text-sm font-medium text-gray-300">
                                Token Symbol
                            </label>
                            <input
                                id="tokenSymbol"
                                type="text"
                                value={tokenSymbol}
                                onChange={(e) => setTokenSymbol(e.target.value)}
                                placeholder="Enter token symbol"
                                className="mt-1 block w-full px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="initialPrice" className="block text-sm font-medium text-gray-300">
                                Initial Price (in SOL)
                            </label>
                            <input
                                id="initialPrice"
                                type="number"
                                step="0.1"
                                value={initialPrice}
                                onChange={(e) => setInitialPrice(e.target.value)}
                                placeholder="Enter initial price"
                                className="mt-1 block w-full px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="slope" className="block text-sm font-medium text-gray-300">
                                Price Slope (in SOL)
                            </label>
                            <input
                                id="slope"
                                type="number"
                                step="0.1"
                                value={slope}
                                onChange={(e) => setSlope(e.target.value)}
                                placeholder="Enter slope"
                                className="mt-1 block w-full px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500"
                                disabled={loading}
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                The rate at which the token price increases with each purchase
                            </p>
                        </div>

                        {status && (
                            <div className={`p-3 rounded-lg text-sm ${status.includes('Error')
                                ? 'status-error'
                                : status.includes('successfully')
                                    ? 'status-success'
                                    : 'status-info'
                                }`}>
                                <div className="flex items-start">
                                    {status.includes('Error') ? (
                                        <IconError className="h-5 w-5 mr-2 text-red-400 mt-0.5 flex-shrink-0" />
                                    ) : status.includes('successfully') ? (
                                        <IconSuccess className="h-5 w-5 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <IconInfo className="h-5 w-5 mr-2 text-blue-400 mt-0.5 flex-shrink-0" />
                                    )}
                                    <p className="break-all whitespace-pre-line">{status}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-4">
                            <button
                                onClick={handleCreateToken}
                                disabled={loading || !tokenName || !tokenSymbol || !initialPrice || !slope}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <LoadingSpinner size="sm" color="white" />
                                        <span className="ml-2">Processing...</span>
                                    </div>
                                ) : 'Create Token'}
                            </button>
                            <button
                                onClick={disconnect}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg font-medium text-sm transition duration-200 shadow-md"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Phantom Wallet Devnet Instructions */}
            <div className="mt-6 bg-gray-800/60 p-4 rounded-lg border border-gray-700/50 text-sm">
                <h3 className="font-medium text-gray-300 mb-2 flex items-center">
                    <IconInfo className="h-4 w-4 mr-2 text-indigo-400" />
                    How to Switch to Devnet in Phantom
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-gray-400">
                    <li>Open Phantom wallet extension</li>
                    <li>Click on the gear icon (Settings) in the bottom right</li>
                    <li>Select "Developer Settings"</li>
                    <li>Toggle "Automatically Approve API Requests" (optional)</li>
                    <li>Select "Devnet" under "Network"</li>
                    <li>Close settings and return to this page</li>
                </ol>
            </div>
        </div>
    );
};

export default CreateToken;