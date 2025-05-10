import { useState, useEffect } from 'react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { BN } from '@project-serum/anchor';
import { getUserCreatedTokens } from '../utils/anchorClient';
import { initializeWithRawInstructions } from '../utils/specializedInitialize';
import { IconInfo, IconSuccess, IconError, LoadingSpinner } from './Icons';

const InitializeBondingCurve = () => {
    const [loading, setLoading] = useState(false);
    const [tokenList, setTokenList] = useState([]);
    const [filteredTokens, setFilteredTokens] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedToken, setSelectedToken] = useState('');
    const [initialPrice, setInitialPrice] = useState('1');
    const [slope, setSlope] = useState('0.1');
    const [status, setStatus] = useState('');
    const [mounted, setMounted] = useState(false);
    const [hasTokensNeedingCurve, setHasTokensNeedingCurve] = useState(false);

    // Use the wallet adapter hook
    const { publicKey, disconnect, signTransaction, signMessage, signAllTransactions } = useWallet();

    // Handle wallet adapter hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load user's tokens that need bonding curve initialization
    useEffect(() => {
        if (publicKey) {
            loadUserTokens();
        }
    }, [publicKey]);

    // Filter tokens based on search query
    useEffect(() => {
        if (tokenList.length > 0) {
            if (!searchQuery) {
                setFilteredTokens(tokenList);
                return;
            }

            const lowercaseQuery = searchQuery.toLowerCase();
            const filtered = tokenList.filter(token =>
                (token.name && token.name.toLowerCase().includes(lowercaseQuery)) ||
                (token.symbol && token.symbol.toLowerCase().includes(lowercaseQuery)) ||
                token.mint.toLowerCase().includes(lowercaseQuery)
            );

            setFilteredTokens(filtered);
        }
    }, [searchQuery, tokenList]);

    const loadUserTokens = () => {
        if (!publicKey) return;

        // Get tokens from local storage
        const userTokens = getUserCreatedTokens(publicKey.toString());

        // Filter tokens that need bonding curve or don't have one yet
        const tokensNeedingCurve = userTokens.filter(token =>
            token.needsBondingCurve === true || !token.bondingCurve
        );

        setHasTokensNeedingCurve(tokensNeedingCurve.length > 0);
        setTokenList(tokensNeedingCurve);
        setFilteredTokens(tokensNeedingCurve);

        // If we have tokens, select the first one by default
        if (tokensNeedingCurve.length > 0) {
            setSelectedToken(tokensNeedingCurve[0].mint);
        }
    };

    const handleInitializeCurve = async () => {
        try {
            if (!publicKey) {
                throw new Error('Wallet not connected');
            }

            if (!selectedToken) {
                throw new Error('Please select a token');
            }

            if (!initialPrice || !slope) {
                throw new Error('Please fill in all fields');
            }

            if (isNaN(initialPrice) || parseFloat(initialPrice) <= 0) {
                throw new Error('Initial price must be a positive number');
            }

            if (isNaN(slope) || parseFloat(slope) <= 0) {
                throw new Error('Slope must be a positive number');
            }

            setLoading(true);
            setStatus('Initializing bonding curve...');

            // Create a wallet adapter object with the necessary methods
            const wallet = {
                publicKey: publicKey,
                signTransaction: signTransaction,
                signMessage: signMessage,
                signAllTransactions: signAllTransactions
            };

            // Convert price and slope to lamports using BN
            const initialPriceInSol = parseFloat(initialPrice);
            const slopeInSol = parseFloat(slope);

            // Convert to lamports (multiply by 10^9) as integers to avoid precision issues
            const priceInLamports = new BN(Math.floor(initialPriceInSol * LAMPORTS_PER_SOL));
            const slopeInLamports = new BN(Math.floor(slopeInSol * LAMPORTS_PER_SOL));

            console.log('Price in Lamports:', priceInLamports.toString());
            console.log('Slope in Lamports:', slopeInLamports.toString());
            console.log('Price is BN instance:', priceInLamports instanceof BN);
            console.log('Slope is BN instance:', slopeInLamports instanceof BN);

            // Initialize the bonding curve using raw instructions
            const curveResult = await initializeWithRawInstructions(
                wallet,
                priceInLamports,
                slopeInLamports,
                new PublicKey(selectedToken)
            );

            if (curveResult.success) {
                setStatus(`Bonding curve initialized successfully!
                    Transaction: ${curveResult.signature}
                    Explorer: ${curveResult.explorerUrl}`);

                // Update the token in localStorage to mark it as initialized
                const userTokens = getUserCreatedTokens(publicKey.toString());
                const updatedTokens = userTokens.map(token => {
                    if (token.mint === selectedToken) {
                        return {
                            ...token,
                            bondingCurve: curveResult.address,
                            bondingCurveUrl: curveResult.explorerUrl,
                            needsBondingCurve: false,
                            initialPrice: initialPrice,
                            slope: slope
                        };
                    }
                    return token;
                });

                // Save back to localStorage
                if (typeof window !== 'undefined') {
                    const existingTokensStr = localStorage.getItem('userCreatedTokens') || '{}';
                    const existingTokens = JSON.parse(existingTokensStr);
                    existingTokens[publicKey.toString()] = updatedTokens;
                    localStorage.setItem('userCreatedTokens', JSON.stringify(existingTokens));
                }

                // Reload token list
                loadUserTokens();
            } else {
                throw new Error(curveResult.error || "Failed to initialize bonding curve");
            }
        } catch (error) {
            console.error('Error initializing bonding curve:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 text-gray-200">
            <div className="flex items-center mb-2">
                <IconInfo className="h-5 w-5 mr-2 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Initialize Bonding Curve</h2>
            </div>
            <p className="text-gray-400 text-sm">Initialize a bonding curve for a token you've already created.</p>

            {!mounted ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="lg" color="indigo" />
                </div>
            ) : !publicKey ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                    <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl border border-purple-800/30 max-w-md w-full text-center shadow-lg">
                        <IconInfo className="h-8 w-8 mx-auto mb-4 text-purple-500" />
                        <h3 className="text-xl font-bold text-white mb-2">Initialize Bonding Curve</h3>
                        <p className="text-gray-300 mb-6">Connect your wallet to initialize bonding curves for your tokens</p>
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
                                <h3 className="text-lg font-bold text-white mb-1">Initialize Bonding Curve</h3>
                                <p className="text-gray-400 text-sm">Configure the bonding curve for your token</p>
                            </div>
                            <div className="bg-gray-800/60 rounded-lg p-2.5 border border-gray-700/50">
                                <p className="text-xs text-gray-400">Connected as</p>
                                <p className="text-gray-300 font-mono text-xs truncate">{publicKey.toString()}</p>
                            </div>
                        </div>

                        {!hasTokensNeedingCurve ? (
                            <div className="text-center py-6 bg-gray-800/50 rounded-lg border border-gray-700/30">
                                <p className="text-gray-300">No tokens found that need a bonding curve</p>
                                <p className="text-gray-400 text-sm mt-2">Create a token first in the Token Creation tab</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label htmlFor="searchQuery" className="block text-sm font-medium text-purple-300 mb-1.5">
                                        Search Tokens
                                    </label>
                                    <input
                                        id="searchQuery"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name, symbol, or address"
                                        className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                    />
                                </div>

                                <div className="md:col-span-2 max-h-60 overflow-y-auto bg-gray-800/60 rounded-lg border border-gray-700/80 shadow-inner">
                                    {filteredTokens.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400">
                                            No tokens found matching "{searchQuery}"
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-700/50">
                                            {filteredTokens.map((token) => (
                                                <div
                                                    key={token.mint}
                                                    className={`p-3 cursor-pointer hover:bg-purple-900/20 transition-colors ${selectedToken === token.mint ? 'bg-purple-900/40 border-l-4 border-purple-500' : ''
                                                        }`}
                                                    onClick={() => setSelectedToken(token.mint)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="font-semibold text-white flex items-center">
                                                                <span className="bg-purple-900/40 text-purple-300 text-xs px-2 py-1 rounded mr-2">
                                                                    {token.symbol || 'N/A'}
                                                                </span>
                                                                {token.name || 'Unnamed Token'}
                                                            </div>
                                                            <div className="text-xs text-gray-400 font-mono mt-1 truncate">
                                                                {token.mint}
                                                            </div>
                                                        </div>
                                                        {selectedToken === token.mint && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="initialPrice" className="block text-sm font-medium text-purple-300 mb-1.5">
                                        Initial Price (SOL)
                                    </label>
                                    <input
                                        id="initialPrice"
                                        type="number"
                                        min="0.000001"
                                        step="0.000001"
                                        value={initialPrice}
                                        onChange={(e) => setInitialPrice(e.target.value)}
                                        placeholder="1"
                                        className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                        disabled={loading}
                                    />
                                    <p className="mt-1 text-xs text-gray-400">Starting price of your token in SOL</p>
                                </div>

                                <div>
                                    <label htmlFor="slope" className="block text-sm font-medium text-purple-300 mb-1.5">
                                        Slope (SOL)
                                    </label>
                                    <input
                                        id="slope"
                                        type="number"
                                        min="0.0000001"
                                        step="0.0000001"
                                        value={slope}
                                        onChange={(e) => setSlope(e.target.value)}
                                        placeholder="0.1"
                                        className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                        disabled={loading}
                                    />
                                    <p className="mt-1 text-xs text-gray-400">Price increase per token minted</p>
                                </div>

                                <div className="md:col-span-2">
                                    <button
                                        onClick={handleInitializeCurve}
                                        disabled={loading || !selectedToken}
                                        className={`w-full py-3 px-5 rounded-lg font-medium text-white transition duration-300 ${loading || !selectedToken
                                            ? 'bg-purple-900/40 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-700/20 hover:-translate-y-0.5 active:translate-y-0'
                                            }`}
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center">
                                                <LoadingSpinner size="sm" color="white" />
                                                <span className="ml-2">Initializing...</span>
                                            </div>
                                        ) : (
                                            'Initialize Bonding Curve'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {status && (
                            <div className={`mt-5 p-4 rounded-lg ${status.includes('Error') ? 'bg-red-900/20 border border-red-800/40' : status.includes('success') ? 'bg-green-900/20 border border-green-800/40' : 'bg-blue-900/20 border border-blue-800/40'}`}>
                                <div className="flex">
                                    {status.includes('Error') ? (
                                        <IconError className="h-5 w-5 mr-2 text-red-400" />
                                    ) : status.includes('success') ? (
                                        <IconSuccess className="h-5 w-5 mr-2 text-green-400" />
                                    ) : (
                                        <IconInfo className="h-5 w-5 mr-2 text-blue-400" />
                                    )}
                                    <div className="text-sm whitespace-pre-line">
                                        {status}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitializeBondingCurve; 