import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getUserCreatedTokens, checkBondingCurveInitialized } from '../utils/anchorClient';
import Link from 'next/link';

const UserTokens = () => {
    const [tokens, setTokens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bondingCurveInfo, setBondingCurveInfo] = useState(null);
    const [bondingCurveLoaded, setBondingCurveLoaded] = useState(false);
    const [tokensLoaded, setTokensLoaded] = useState(false);
    const wallet = useWallet();

    // Separate useEffect for bonding curve info to prevent conflicts
    useEffect(() => {
        const loadBondingCurveInfo = async () => {
            try {
                const bcInfo = await checkBondingCurveInitialized();
                console.log('Bonding curve info loaded:', bcInfo);
                setBondingCurveInfo(bcInfo);
                setBondingCurveLoaded(true);
            } catch (error) {
                console.error("Error loading bonding curve info:", error);
                // Set a fallback bondingCurveInfo instead of just setting loaded to true
                setBondingCurveInfo({
                    initialized: false,
                    error: error.message,
                    address: "Error loading bonding curve data",
                    explorerUrl: "https://explorer.solana.com/address/4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd?cluster=devnet"
                });
                setBondingCurveLoaded(true); // Mark as loaded even on error to prevent infinite loading
            }
        };

        loadBondingCurveInfo();

        // Refresh bonding curve info every 30 seconds
        const intervalId = setInterval(loadBondingCurveInfo, 30000);
        return () => clearInterval(intervalId);
    }, []);

    // Separate useEffect for user tokens
    useEffect(() => {
        const loadUserTokens = async () => {
            try {
                if (wallet.publicKey) {
                    const userTokens = getUserCreatedTokens(wallet.publicKey.toString());
                    setTokens(userTokens);
                } else {
                    setTokens([]);
                }
                setTokensLoaded(true);
            } catch (error) {
                console.error("Error loading token data:", error);
                setTokensLoaded(true); // Mark as loaded even on error
            }
        };

        loadUserTokens();
    }, [wallet.publicKey]);

    // Update loading state when both data sources are loaded
    useEffect(() => {
        if (bondingCurveLoaded && tokensLoaded) {
            setIsLoading(false);
        }
    }, [bondingCurveLoaded, tokensLoaded]);

    if (isLoading) {
        return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div></div>;
    }

    if (!wallet.publicKey) {
        return <div className="p-4 text-center">Connect your wallet to view your tokens</div>;
    }

    return (
        <div className="bg-gradient-to-br from-gray-800/40 to-purple-900/20 backdrop-blur-md rounded-xl border border-purple-900/30 shadow-lg p-6 mx-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-white">Your Created Tokens</h2>

            {/* Bonding Curve Info */}
            {bondingCurveInfo && (
                <div className="bg-gradient-to-br from-gray-800/60 to-purple-900/20 backdrop-blur-md rounded-xl border border-purple-800/40 p-4 mb-6">
                    <h3 className="text-lg font-medium text-white mb-2">Bonding Curve Status</h3>
                    <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${bondingCurveInfo.initialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-gray-300">{bondingCurveInfo.initialized ? 'Initialized' : 'Not Initialized'}</span>
                    </div>
                    {bondingCurveInfo.address && (
                        <div className="text-sm text-gray-400">
                            <span>Address: {bondingCurveInfo.address.substring(0, 8)}...{bondingCurveInfo.address.substring(bondingCurveInfo.address.length - 8)}</span>
                            <div className="mt-2">
                                <a
                                    href={bondingCurveInfo.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-1 px-3 rounded-md text-sm transition-colors"
                                >
                                    View on Explorer
                                </a>
                            </div>
                        </div>
                    )}
                    <div className="mt-3 text-sm text-gray-400">
                        <p>Note: This project uses a single bonding curve for all tokens.</p>
                    </div>

                    {/* Display error message if present */}
                    {bondingCurveInfo.error && (
                        <div className="mt-3 p-2 bg-red-900/20 border border-red-800/30 rounded-md">
                            <p className="text-xs text-red-300">
                                Error: {bondingCurveInfo.error.includes('Blockhash not found')
                                    ? 'Network connection issue. Please try again later.'
                                    : bondingCurveInfo.error}
                            </p>
                        </div>
                    )}

                    {/* Add reload button */}
                    <div className="mt-3 flex justify-end">
                        <button
                            onClick={() => {
                                setBondingCurveLoaded(false);
                                checkBondingCurveInitialized().then(info => {
                                    setBondingCurveInfo(info);
                                    setBondingCurveLoaded(true);
                                }).catch(err => {
                                    console.error("Reload error:", err);
                                    setBondingCurveInfo({
                                        initialized: false,
                                        error: err.message,
                                        address: "Error reloading data",
                                        explorerUrl: "https://explorer.solana.com"
                                    });
                                    setBondingCurveLoaded(true);
                                });
                            }}
                            className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-1 px-2 rounded text-xs"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            )}

            {tokens.length === 0 ? (
                <div className="p-6 text-center text-gray-300 bg-gray-800/40 rounded-xl border border-gray-700/40">
                    <p className="text-lg font-medium mb-2">You haven't created any tokens yet</p>
                    <p className="text-sm text-gray-400 mb-4">Create your first token using the Create tab in the app</p>
                    <Link
                        href="/app#create"
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:shadow-purple-700/20 transition"
                    >
                        Create a Token
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {tokens.map((token, index) => (
                        <div key={index} className="bg-gradient-to-br from-gray-800/60 to-purple-900/20 backdrop-blur-md rounded-xl border border-purple-800/40 p-4 hover:border-purple-600/60 transition-all">
                            <div className="flex flex-wrap justify-between items-center">
                                <div className="mb-2">
                                    <h3 className="text-lg font-medium text-white">Token: {token.mint.substring(0, 8)}...{token.mint.substring(token.mint.length - 8)}</h3>
                                    <p className="text-gray-400 text-sm">Created: {new Date(token.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <a
                                        href={token.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-1 px-3 rounded-md text-sm transition-colors"
                                    >
                                        View Token
                                    </a>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div className="text-gray-400">Initial Price: <span className="text-white">{token.initialPrice} SOL</span></div>
                                <div className="text-gray-400">Slope: <span className="text-white">{token.slope}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UserTokens; 