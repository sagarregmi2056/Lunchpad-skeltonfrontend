import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, TOKEN_MINT } from '../utils/anchorClient';
import { Program } from '@project-serum/anchor';
import idl from '../utils/idl.json';
import { IconInfo, IconPrice, IconSupply, IconSlope, IconWallet, IconCopy, IconExternal, StatusBadge, LoadingSpinner } from './Icons';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

const PoolInfo = () => {
    const [loading, setLoading] = useState(true);
    const [poolData, setPoolData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPoolInfo = async () => {
            try {
                setLoading(true);

                // Find the PDA for the bonding curve
                const [bondingCurvePDA] = await PublicKey.findProgramAddress(
                    [BONDING_CURVE_SEED],
                    PROGRAM_ID
                );

                // Create a provider for read-only operations
                const provider = {
                    connection,
                    publicKey: PublicKey.default,
                };

                // Create program instance
                const program = new Program(idl, PROGRAM_ID, provider);

                // Fetch the bonding curve account data
                const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);

                // Safely convert BN to number (avoiding toNumber() which can overflow)
                // Using string conversion and parsing with decimal representation
                const initialPriceBN = bondingCurveAccount.initialPrice.toString();
                const slopeBN = bondingCurveAccount.slope.toString();
                const totalSupplyBN = bondingCurveAccount.totalSupply.toString();

                // Format the data for display, using string operations for safety
                const formattedData = {
                    initialPrice: parseFloat(initialPriceBN) / 1e9,
                    slope: parseFloat(slopeBN) / 1e9,
                    supply: parseFloat(totalSupplyBN) / 1e9,
                    initialPriceBN,
                    slopeBN,
                    supplyBN: totalSupplyBN,
                    authority: bondingCurveAccount.authority.toString(),
                    tokenMint: TOKEN_MINT.toString(),
                };

                setPoolData(formattedData);
                setError(null);
            } catch (err) {
                console.error('Error fetching pool info:', err);
                setError('Failed to load pool information. The bonding curve might not be initialized yet.');
                setPoolData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPoolInfo();

        // Refresh every 30 seconds
        const intervalId = setInterval(fetchPoolInfo, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const calculateCurrentPrice = () => {
        if (!poolData) return 0;
        return poolData.initialPrice + (poolData.slope * poolData.supply);
    };

    return (
        <div className="space-y-6 text-gray-200">
            <div className="flex items-center mb-2">
                <IconInfo className="h-5 w-5 mr-2 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Bonding Curve Pool Information</h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" color="indigo" />
                </div>
            ) : error ? (
                <div className="status-error p-4 rounded-lg shadow-lg">
                    <div className="flex items-center">
                        <IconInfo className="h-5 w-5 mr-2 text-red-400" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                </div>
            ) : poolData ? (
                <div className="space-y-6">
                    <div className="bg-indigo-900/20 backdrop-blur-md p-5 rounded-xl border border-indigo-800/30 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-indigo-300 mb-1">Current Market Price</h3>
                                <p className="text-3xl font-bold text-white">{calculateCurrentPrice().toFixed(6)} <span className="text-lg text-indigo-300">SOL</span></p>
                            </div>
                            <StatusBadge status="active" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-5 rounded-xl shadow-md border border-indigo-800/40 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-sm font-medium text-indigo-300 mb-2">Total Supply</h3>
                            <p className="text-2xl font-bold text-white">{poolData.supply.toLocaleString()} <span className="text-sm text-indigo-300">tokens</span></p>
                            <div className="mt-3 flex items-center text-xs text-indigo-400">
                                <IconSupply className="h-4 w-4 mr-1" />
                                Number of tokens in circulation
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-5 rounded-xl shadow-md border border-indigo-800/40 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-sm font-medium text-indigo-300 mb-2">Initial Price</h3>
                            <p className="text-2xl font-bold text-white">{poolData.initialPrice.toFixed(6)} <span className="text-sm text-indigo-300">SOL</span></p>
                            <div className="mt-3 flex items-center text-xs text-indigo-400">
                                <IconPrice className="h-4 w-4 mr-1" />
                                Starting price when supply was 0
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-5 rounded-xl shadow-md border border-indigo-800/40 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-sm font-medium text-indigo-300 mb-2">Price Slope</h3>
                            <p className="text-2xl font-bold text-white">{poolData.slope.toFixed(6)} <span className="text-sm text-indigo-300">SOL</span></p>
                            <div className="mt-3 flex items-center text-xs text-indigo-400">
                                <IconSlope className="h-4 w-4 mr-1" />
                                Price increase per token purchased
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-5 rounded-xl shadow-md border border-indigo-800/40 hover:shadow-lg transition-shadow duration-200">
                            <h3 className="text-sm font-medium text-indigo-300 mb-2">Market Liquidity</h3>
                            <p className="text-2xl font-bold text-white">{(poolData.initialPrice * poolData.supply + 0.5 * poolData.slope * poolData.supply * poolData.supply).toFixed(4)} <span className="text-sm text-indigo-300">SOL</span></p>
                            <div className="mt-3 flex items-center text-xs text-indigo-400">
                                <IconWallet className="h-4 w-4 mr-1" />
                                Estimated total locked value
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-base font-semibold text-white mb-3 flex items-center">
                            <IconInfo className="h-4 w-4 mr-2 text-indigo-400" />
                            Technical Details
                        </h3>
                        <div className="bg-gray-800/60 backdrop-blur-md p-4 rounded-xl space-y-3 border border-gray-700/60 shadow-md">
                            <div>
                                <span className="text-xs font-medium text-gray-400">Token Mint:</span>
                                <div className="flex items-center mt-1">
                                    <p className="text-xs font-mono text-purple-300 break-all">{poolData.tokenMint}</p>
                                    <button
                                        className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                                        onClick={() => {
                                            navigator.clipboard.writeText(poolData.tokenMint);
                                        }}
                                    >
                                        <IconCopy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-gray-400">Authority:</span>
                                <div className="flex items-center mt-1">
                                    <p className="text-xs font-mono text-purple-300 break-all">{poolData.authority}</p>
                                    <button
                                        className="ml-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                                        onClick={() => {
                                            navigator.clipboard.writeText(poolData.authority);
                                        }}
                                    >
                                        <IconCopy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-medium text-gray-400">Explorer Links:</span>
                                <div className="flex mt-1.5 space-x-3">
                                    <a
                                        href={`https://explorer.solana.com/address/${poolData.tokenMint}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/60 px-2.5 py-1.5 rounded-md transition-colors flex items-center"
                                    >
                                        <IconExternal className="h-3.5 w-3.5 mr-1" />
                                        Token Mint
                                    </a>
                                    <a
                                        href={`https://explorer.solana.com/address/${poolData.authority}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/60 px-2.5 py-1.5 rounded-md transition-colors flex items-center"
                                    >
                                        <IconExternal className="h-3.5 w-3.5 mr-1" />
                                        Authority
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default PoolInfo; 