import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorProgram, TOKEN_MINT, updateBondingCurveParameters } from '../utils/anchorClient';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';
import { IconCoin, IconInfo, IconSuccess, IconError, LoadingSpinner, IconSettings } from './Icons';

const UpdateParameters = () => {
    const [loading, setLoading] = useState(false);
    const [initialPrice, setInitialPrice] = useState('');
    const [slope, setSlope] = useState('');
    const [currentParams, setCurrentParams] = useState(null);
    const [status, setStatus] = useState('');
    const [mounted, setMounted] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const { program, provider, bondingCurvePDA } = useAnchorProgram();
    const { publicKey } = useWallet();

    // Handle wallet adapter hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch current bonding curve parameters
    useEffect(() => {
        const fetchBondingCurveParams = async () => {
            if (!program || !bondingCurvePDA) return;

            try {
                setFetchingData(true);
                const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);

                const params = {
                    initialPrice: (bondingCurveAccount?.initialPrice?.toString() || "0") / LAMPORTS_PER_SOL,
                    slope: (bondingCurveAccount?.slope?.toString() || "0") / LAMPORTS_PER_SOL,
                    totalSupply: (bondingCurveAccount?.totalSupply?.toString() || "0") / 1e9,
                    authority: bondingCurveAccount?.authority?.toString() || ""
                };

                setCurrentParams(params);
                setInitialPrice(params.initialPrice.toFixed(8));
                setSlope(params.slope.toFixed(8));
            } catch (error) {
                console.error('Error fetching bonding curve parameters:', error);
                setStatus(`Error fetching parameters: ${error.message}`);
            } finally {
                setFetchingData(false);
            }
        };

        if (program && bondingCurvePDA) {
            fetchBondingCurveParams();
        }
    }, [program, bondingCurvePDA]);

    const handleUpdateParameters = async () => {
        try {
            if (!program || !provider) {
                throw new Error('Program not initialized');
            }

            if (!initialPrice || !slope) {
                throw new Error('Please enter both parameters');
            }

            if (isNaN(initialPrice) || parseFloat(initialPrice) <= 0) {
                throw new Error('Initial price must be a positive number');
            }

            if (isNaN(slope) || parseFloat(slope) <= 0) {
                throw new Error('Slope must be a positive number');
            }

            setLoading(true);
            setStatus('Preparing to update parameters...');

            // Convert to lamports (SOL * 10^9)
            const initialPriceLamports = new BN(Math.floor(parseFloat(initialPrice) * LAMPORTS_PER_SOL));
            const slopeLamports = new BN(Math.floor(parseFloat(slope) * LAMPORTS_PER_SOL));

            setStatus('Updating bonding curve parameters...');

            // Create a wallet adapter object with the necessary methods
            const wallet = {
                publicKey: provider.wallet.publicKey,
                signTransaction: provider.wallet.signTransaction,
                signMessage: provider.wallet.signMessage,
                signAllTransactions: provider.wallet.signAllTransactions
            };

            // Call the utility function to update parameters
            const result = await updateBondingCurveParameters(
                wallet,
                initialPriceLamports,
                slopeLamports,
                TOKEN_MINT
            );

            if (result.success) {
                setStatus(`Parameters updated successfully!\nTransaction: ${result.signature}`);

                // Update the UI to show new parameters
                const updatedParams = {
                    ...currentParams,
                    initialPrice: initialPrice,
                    slope: slope
                };
                setCurrentParams(updatedParams);
            } else {
                throw new Error(result.error || 'Failed to update parameters');
            }

        } catch (error) {
            console.error('Error updating parameters:', error);
            setStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const isCurrentAuthority = currentParams && publicKey &&
        currentParams.authority === publicKey.toString();

    return (
        <div className="space-y-5 text-gray-200">
            <div className="flex items-center mb-2">
                <IconSettings className="h-5 w-5 mr-2 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Update Bonding Curve</h2>
            </div>
            <p className="text-gray-400 text-sm">Modify the parameters of the bonding curve to adjust pricing.</p>

            {!mounted ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="lg" color="purple" />
                </div>
            ) : !publicKey ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                    <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl border border-purple-800/30 max-w-md w-full text-center shadow-lg">
                        <IconSettings className="h-8 w-8 mx-auto mb-4 text-purple-500" />
                        <h3 className="text-xl font-bold text-white mb-2">Admin Actions</h3>
                        <p className="text-gray-300 mb-6">Connect your wallet to update bonding curve parameters</p>
                        <div className="wallet-button-wrapper">
                            <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-lg hover:shadow-purple-700/20 transition transform hover:-translate-y-0.5 active:translate-y-0" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 backdrop-blur-sm rounded-xl border border-purple-800/30 shadow-lg p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Current Parameters</h3>
                                <p className="text-gray-400 text-sm">These are the active bonding curve settings</p>
                            </div>
                        </div>

                        {fetchingData ? (
                            <div className="flex justify-center py-6">
                                <LoadingSpinner size="md" color="purple" />
                            </div>
                        ) : currentParams ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-purple-800/30 pt-4">
                                <div className="bg-purple-900/10 rounded-lg p-3 border border-purple-800/20">
                                    <div className="text-xs text-purple-400 mb-1">Initial Price</div>
                                    <div className="text-lg font-semibold text-white">{currentParams.initialPrice.toFixed(8)} SOL</div>
                                </div>
                                <div className="bg-purple-900/10 rounded-lg p-3 border border-purple-800/20">
                                    <div className="text-xs text-purple-400 mb-1">Price Slope</div>
                                    <div className="text-lg font-semibold text-white">{currentParams.slope.toFixed(8)} SOL</div>
                                </div>
                                <div className="bg-purple-900/10 rounded-lg p-3 border border-purple-800/20">
                                    <div className="text-xs text-purple-400 mb-1">Total Supply</div>
                                    <div className="text-lg font-semibold text-white">{currentParams.totalSupply.toLocaleString()} tokens</div>
                                </div>
                                <div className="bg-purple-900/10 rounded-lg p-3 border border-purple-800/20">
                                    <div className="text-xs text-purple-400 mb-1">Authority</div>
                                    <div className="text-xs font-mono text-gray-300 truncate">{currentParams.authority}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-red-400 p-4 bg-red-900/20 rounded border border-red-700/30">
                                <IconError className="h-4 w-4 inline mr-2" />
                                Unable to fetch bonding curve parameters
                            </div>
                        )}
                    </div>

                    {publicKey && currentParams && !isCurrentAuthority && (
                        <div className="bg-amber-900/30 p-4 rounded-lg border border-amber-800/40 text-amber-300">
                            <IconInfo className="h-5 w-5 mr-2 inline-block" />
                            You are not the authority for this bonding curve and cannot update parameters.
                        </div>
                    )}

                    {publicKey && isCurrentAuthority && (
                        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
                            <div className="bg-purple-900/20 px-6 py-4 border-b border-purple-800/30">
                                <h3 className="font-medium text-white">Update Parameters</h3>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="initialPrice" className="block text-sm font-medium text-purple-300 mb-1.5">
                                            Initial Price (in SOL)
                                        </label>
                                        <input
                                            id="initialPrice"
                                            type="number"
                                            step="0.00000001"
                                            min="0.00000001"
                                            value={initialPrice}
                                            onChange={(e) => setInitialPrice(e.target.value)}
                                            placeholder="0.000001"
                                            className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                            disabled={loading}
                                        />
                                        <p className="mt-1 text-xs text-purple-400/80">
                                            Base price before any tokens are purchased
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="slope" className="block text-sm font-medium text-purple-300 mb-1.5">
                                            Price Slope (in SOL)
                                        </label>
                                        <input
                                            id="slope"
                                            type="number"
                                            step="0.00000001"
                                            min="0.00000001"
                                            value={slope}
                                            onChange={(e) => setSlope(e.target.value)}
                                            placeholder="0.0000001"
                                            className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                            disabled={loading}
                                        />
                                        <p className="mt-1 text-xs text-purple-400/80">
                                            The rate at which price increases per token
                                        </p>
                                    </div>
                                </div>

                                {status && (
                                    <div className={`mt-4 p-4 rounded-lg text-sm ${status.includes('Error')
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

                                <div className="pt-4 flex justify-end">
                                    <button
                                        onClick={handleUpdateParameters}
                                        disabled={loading || !isCurrentAuthority}
                                        className={`px-6 py-3 rounded-lg font-semibold text-sm shadow-lg transition transform hover:-translate-y-0.5 active:translate-y-0 ${loading
                                            ? 'bg-gray-600 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:shadow-purple-700/20'
                                            }`}
                                    >
                                        {loading ? (
                                            <span className="flex items-center">
                                                <LoadingSpinner size="sm" color="white" />
                                                <span className="ml-2">Processing...</span>
                                            </span>
                                        ) : (
                                            'Update Parameters'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UpdateParameters; 