import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getUserCreatedTokens, checkBondingCurveInitialized } from '../utils/anchorClient';
import Link from 'next/link';

const UserTokens = () => {
    const [tokens, setTokens] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [bondingCurveInfo, setBondingCurveInfo] = useState(null);
    const wallet = useWallet();

    useEffect(() => {
        const loadUserTokens = async () => {
            setIsLoading(true);
            try {
                // Check bonding curve status
                const bcInfo = await checkBondingCurveInitialized();
                setBondingCurveInfo(bcInfo);

                // Get user tokens
                if (wallet.publicKey) {
                    const userTokens = getUserCreatedTokens(wallet.publicKey.toString());
                    setTokens(userTokens);
                } else {
                    setTokens([]);
                }
            } catch (error) {
                console.error("Error loading token data:", error);
            }
            setIsLoading(false);
        };

        loadUserTokens();
        // Reload when wallet changes
        const intervalId = setInterval(loadUserTokens, 5000);

        return () => clearInterval(intervalId);
    }, [wallet.publicKey]);

    if (isLoading) {
        return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
    }

    if (!wallet.publicKey) {
        return <div className="p-4 text-center">Connect your wallet to view your tokens</div>;
    }

    return (
        <div className="bg-gray-900 rounded-xl p-6 mx-auto my-4 max-w-4xl">
            <h2 className="text-xl font-bold mb-4 text-white">Your Created Tokens</h2>

            {/* Bonding Curve Info */}
            {bondingCurveInfo && (
                <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
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
                                    className="bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded-md text-sm transition-colors"
                                >
                                    View on Explorer
                                </a>
                            </div>
                        </div>
                    )}
                    <div className="mt-3 text-sm text-gray-400">
                        <p>Note: This project uses a single bonding curve for all tokens.</p>
                    </div>
                </div>
            )}

            {tokens.length === 0 ? (
                <div className="p-4 text-center">You haven't created any tokens yet</div>
            ) : (
                <div className="space-y-4">
                    {tokens.map((token, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-all">
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
                                        className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md text-sm transition-colors"
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