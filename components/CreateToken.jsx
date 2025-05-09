import { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTokenWithMetadata } from '../utils/createToken';
import { initializeBondingCurve } from '../utils/anchorClient';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { IconCoin, IconInfo, IconSuccess, IconError, LoadingSpinner } from './Icons';
import { BN } from '@project-serum/anchor';

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

                // Store the mint address for later use
                const mintAddress = result.mint;

                // Convert price and slope to lamports
                const priceInLamports = new BN(Math.floor(parseFloat(initialPrice) * LAMPORTS_PER_SOL));
                const slopeInLamports = new BN(Math.floor(parseFloat(slope) * LAMPORTS_PER_SOL));

                console.log('Price in Lamports:', priceInLamports.toString());
                console.log('Slope in Lamports:', slopeInLamports.toString());

                try {
                    // Initialize the bonding curve with the new TOKEN_MINT
                    const curveResult = await initializeBondingCurve(
                        wallet,
                        priceInLamports,
                        slopeInLamports,
                        new PublicKey(mintAddress) // Pass the new token mint address
                    );

                    if (curveResult.success) {
                        const statusMessage = curveResult.message
                            ? `Token created successfully!\nMint address: ${mintAddress}\nBonding curve: ${curveResult.message}`
                            : `Token created and initialized successfully!\nMint address: ${mintAddress}\nTransaction: ${curveResult.signature}`;

                        setStatus(statusMessage);
                        setTokenName('');
                        setTokenSymbol('');
                        setInitialPrice('1');
                        setSlope('0.1');
                    } else {
                        throw new Error(curveResult.error || "Failed to initialize bonding curve");
                    }
                } catch (error) {
                    setStatus(`Token created with address ${mintAddress}, but bonding curve failed: ${error.message}`);
                }
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
                <div className="flex flex-col items-center py-8 space-y-4">
                    <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl border border-purple-800/30 max-w-md w-full text-center shadow-lg">
                        <IconCoin className="h-8 w-8 mx-auto mb-4 text-purple-500" />
                        <h3 className="text-xl font-bold text-white mb-2">Create Your Own Token</h3>
                        <p className="text-gray-300 mb-6">Connect your wallet to create and launch your own token with a bonding curve</p>
                        <div className="wallet-button-wrapper">
                            <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-lg hover:shadow-purple-700/20 transition transform hover:-translate-y-0.5 active:translate-y-0" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-xl border border-purple-800/30 shadow-lg p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Launch Your Token</h3>
                                <p className="text-gray-400 text-sm">Fill in the details below to create your token</p>
                            </div>
                            <div className="bg-gray-800/60 rounded-lg p-2.5 border border-gray-700/50">
                                <p className="text-xs text-gray-400">Connected as</p>
                                <p className="text-gray-300 font-mono text-xs truncate">{publicKey.toString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="tokenName" className="block text-sm font-medium text-purple-300 mb-1.5">
                                    Token Name
                                </label>
                                <input
                                    id="tokenName"
                                    type="text"
                                    value={tokenName}
                                    onChange={(e) => setTokenName(e.target.value)}
                                    placeholder="Enter token name"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="tokenSymbol" className="block text-sm font-medium text-purple-300 mb-1.5">
                                    Token Symbol
                                </label>
                                <input
                                    id="tokenSymbol"
                                    type="text"
                                    value={tokenSymbol}
                                    onChange={(e) => setTokenSymbol(e.target.value)}
                                    placeholder="Enter token symbol"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="initialPrice" className="block text-sm font-medium text-purple-300 mb-1.5">
                                    Initial Price (in SOL)
                                </label>
                                <input
                                    id="initialPrice"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={initialPrice}
                                    onChange={(e) => setInitialPrice(e.target.value)}
                                    placeholder="Enter initial price"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="slope" className="block text-sm font-medium text-purple-300 mb-1.5">
                                    Price Slope (in SOL)
                                </label>
                                <input
                                    id="slope"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={slope}
                                    onChange={(e) => setSlope(e.target.value)}
                                    placeholder="Enter slope"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                    disabled={loading}
                                />
                                <p className="mt-1 text-xs text-purple-400/80">
                                    The rate at which price increases with each purchase
                                </p>
                            </div>
                        </div>

                        {status && (
                            <div className={`mt-6 p-4 rounded-lg text-sm ${status.includes('Error')
                                ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                                : status.includes('successfully')
                                    ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                                    : 'bg-blue-900/30 border border-blue-700/50 text-blue-300'
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

                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                            <button
                                onClick={handleCreateToken}
                                disabled={loading || !tokenName || !tokenSymbol || !initialPrice || !slope}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-lg hover:shadow-purple-700/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <LoadingSpinner size="sm" color="white" />
                                        <span className="ml-2">Processing...</span>
                                    </div>
                                ) : 'Launch Token'}
                            </button>
                            <button
                                onClick={disconnect}
                                className="px-6 py-3 rounded-lg font-medium text-sm bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 hover:text-white transition-colors shadow-md"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>

                    {/* Information Box */}
                    <div className="bg-gray-800/40 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50 text-sm">
                        <h3 className="font-medium text-purple-300 mb-3 flex items-center">
                            <IconInfo className="h-4 w-4 mr-2 text-purple-400" />
                            How Bonding Curves Work
                        </h3>
                        <p className="text-gray-400 mb-3">
                            Bonding curves automatically set token prices based on supply. As more tokens are purchased, the price increases following a mathematical formula.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700/50">
                                <h4 className="text-xs font-medium text-purple-300 mb-1">Initial Price</h4>
                                <p className="text-xs text-gray-400">
                                    The starting price of your token before any purchases are made.
                                </p>
                            </div>
                            <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700/50">
                                <h4 className="text-xs font-medium text-purple-300 mb-1">Price Slope</h4>
                                <p className="text-xs text-gray-400">
                                    Determines how quickly the price rises as more tokens are bought.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreateToken;