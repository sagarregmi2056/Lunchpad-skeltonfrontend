import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorProgram, TOKEN_MINT } from '../utils/anchorClient';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';
import {
    IconBuy,
    IconWallet,
    IconLock,
    IconInfo,
    IconSuccess,
    IconError,
    LoadingSpinner,
    NetworkBadge,
    IconExternal
} from './Icons';
import CurveVisualization from './CurveVisualization';

const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

const BuyTokens = () => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [estimatedCost, setEstimatedCost] = useState(null);
    const [transactionStatus, setTransactionStatus] = useState('');
    const { program, provider, userTokenAccount, bondingCurvePDA } = useAnchorProgram();
    const { publicKey } = useWallet();
    const [currentPrice, setCurrentPrice] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [fetchingPrice, setFetchingPrice] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [curveParams, setCurveParams] = useState(null);
    const [priceImpact, setPriceImpact] = useState(null);

    // Handle wallet adapter hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch the current price when the component loads
    useEffect(() => {
        const fetchCurrentPrice = async () => {
            if (!program || !bondingCurvePDA) {
                // Still waiting for program initialization
                return;
            }

            try {
                setFetchingPrice(true);
                setFetchError(null);

                // Get the bonding curve account data
                const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);

                if (!bondingCurveAccount) {
                    throw new Error("Failed to fetch bonding curve data");
                }

                // Safely handle large numbers by using toString instead of toNumber
                const initialPriceBN = bondingCurveAccount.initialPrice?.toString() || "0";
                const slopeBN = bondingCurveAccount.slope?.toString() || "0";
                const totalSupplyBN = bondingCurveAccount.totalSupply?.toString() || "0";

                // Calculate the current price - convert strings to numbers safely
                const initialPrice = parseFloat(initialPriceBN) / LAMPORTS_PER_SOL;
                const slope = parseFloat(slopeBN) / LAMPORTS_PER_SOL;
                const supply = parseFloat(totalSupplyBN) / 1e9;

                const price = initialPrice + (slope * supply);
                setCurrentPrice(price);

                // Store curve parameters for visualization
                setCurveParams({
                    initialPrice,
                    slope,
                    supply
                });

                console.log('Current price calculated:', price);
            } catch (error) {
                console.error('Error fetching current price:', error);
                setFetchError(error.message || "Failed to fetch price data");
            } finally {
                setFetchingPrice(false);
            }
        };

        if (program && bondingCurvePDA) {
            fetchCurrentPrice();
            // Refresh the price every 10 seconds
            const intervalId = setInterval(fetchCurrentPrice, 10000);
            return () => clearInterval(intervalId);
        }
    }, [program, bondingCurvePDA]);

    // Calculate the estimated cost when amount changes
    useEffect(() => {
        if (!currentPrice || !amount || isNaN(amount) || parseFloat(amount) <= 0 || !curveParams) {
            setEstimatedCost(null);
            setPriceImpact(null);
            return;
        }

        const amountNum = parseFloat(amount);
        const { initialPrice, slope, supply } = curveParams;

        // Calculate new price after purchase
        const newSupply = supply + amountNum;
        const newPrice = initialPrice + (slope * newSupply);

        // Calculate average price paid and total cost
        const avgPrice = (currentPrice + newPrice) / 2;
        const cost = amountNum * avgPrice;

        // Calculate price impact percentage
        const priceImpactValue = ((newPrice - currentPrice) / currentPrice) * 100;

        setEstimatedCost(cost);
        setPriceImpact(priceImpactValue);
    }, [amount, currentPrice, curveParams]);

    const handleBuyTokens = async () => {
        try {
            if (!program || !provider || !userTokenAccount) {
                throw new Error('Program not initialized');
            }

            if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
                throw new Error('Please enter a valid amount');
            }

            setLoading(true);
            setTransactionStatus('Preparing transaction...');

            // Get the PDA for bonding curve if not already available
            const bondingCurve = bondingCurvePDA || (await PublicKey.findProgramAddress(
                [BONDING_CURVE_SEED],
                program.programId
            ))[0];

            // Convert amount to program expected format (u64)
            const amountBN = new BN(parseFloat(amount) * 1e9); // Assuming 9 decimals

            setTransactionStatus('Please approve the transaction in your wallet...');

            // Call your program's buy tokens instruction
            const tx = await program.methods
                .buyTokens(amountBN)
                .accounts({
                    bondingCurve: bondingCurve,
                    authority: provider.wallet.publicKey, // The program authority
                    buyer: provider.wallet.publicKey,
                    buyerTokenAccount: userTokenAccount,
                    tokenMint: TOKEN_MINT,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId
                })
                .rpc();

            setTransactionStatus(`Transaction successful! You've purchased ${amount} tokens.`);
            setAmount('');

            // Add short delay then clear status
            setTimeout(() => {
                setTransactionStatus('');
            }, 10000);
        } catch (error) {
            console.error('Error buying tokens:', error);
            setTransactionStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 text-gray-200">
            <div className="flex items-center mb-2">
                <IconBuy className="h-5 w-5 mr-2 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Buy Tokens</h2>
            </div>
            <p className="text-gray-400 text-sm">Purchase tokens from the bonding curve at the current market price.</p>

            {!mounted ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="lg" color="purple" />
                </div>
            ) : !publicKey ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-md p-8 rounded-xl border border-purple-800/40 max-w-md w-full text-center shadow-lg">
                        <IconLock className="h-8 w-8 mx-auto mb-4 text-purple-500" />
                        <h3 className="text-xl font-bold text-white mb-2">Connect Wallet to Trade</h3>
                        <p className="text-gray-300 mb-6">Connect your wallet to buy tokens at the current market price</p>
                        <div className="wallet-button-wrapper">
                            <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-lg hover:shadow-purple-700/20 transition transform hover:-translate-y-0.5 active:translate-y-0" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm rounded-xl border border-purple-800/30 shadow-lg p-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-purple-300 mb-2">Current Market Price</h3>
                                {fetchingPrice ? (
                                    <div className="animate-pulse h-8 w-44 bg-purple-900/30 rounded"></div>
                                ) : fetchError ? (
                                    <div className="text-red-400 text-sm flex items-center">
                                        <IconError className="h-4 w-4 mr-1" />
                                        Error loading price data
                                    </div>
                                ) : currentPrice !== null ? (
                                    <p className="text-3xl font-bold text-gradient">{currentPrice.toFixed(6)} <span className="text-sm font-normal text-purple-300">SOL</span></p>
                                ) : (
                                    <div className="text-yellow-400 text-sm flex items-center">
                                        <IconInfo className="h-4 w-4 mr-1" />
                                        Waiting for price data...
                                    </div>
                                )}
                                <p className="text-xs text-purple-400 mt-1">
                                    Price increases as more tokens are purchased
                                </p>
                            </div>
                            <div className="flex items-center">
                                <NetworkBadge network="devnet" />
                            </div>
                        </div>

                        {/* Add Bonding Curve Visualization */}
                        {currentPrice !== null && !fetchingPrice && !fetchError && (
                            <div className="mt-4 pt-4 border-t border-purple-800/30">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-medium text-purple-300">Bonding Curve</h4>
                                    <span className="text-xs text-purple-400">Hover to see prices</span>
                                </div>
                                <CurveVisualization
                                    initialPrice={curveParams?.initialPrice || 0.001}
                                    slope={curveParams?.slope || 0.0001}
                                    currentSupply={curveParams?.supply || 1000}
                                    height="180px"
                                    curveType="sigmoid"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
                        <div className="bg-purple-900/20 px-6 py-4 border-b border-purple-800/30">
                            <h3 className="font-medium text-white">Buy Tokens</h3>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-purple-300 mb-2">
                                    Amount to Buy
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        id="amount"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="block w-full px-4 py-3 rounded-lg border border-gray-700/80 bg-gray-800/60 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 shadow-inner transition-all duration-200"
                                        disabled={loading}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 sm:text-sm">tokens</span>
                                    </div>
                                </div>
                            </div>

                            {estimatedCost !== null && currentPrice !== null && (
                                <div className="bg-gradient-to-br from-purple-900/10 to-indigo-900/10 p-4 rounded-lg border border-purple-800/30 shadow-inner">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                        <span className="text-sm font-medium text-purple-300">You Pay:</span>
                                        <span className="text-lg font-semibold text-white">
                                            {estimatedCost.toFixed(6)} SOL
                                        </span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-purple-800/20">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-purple-400">Current Price:</span>
                                            <span className="text-purple-300">{currentPrice.toFixed(6)} SOL per token</span>
                                        </div>

                                        {priceImpact !== null && (
                                            <div className="flex justify-between items-center text-xs mt-1">
                                                <span className="text-purple-400">Price Impact:</span>
                                                <span className={`${priceImpact > 5 ? 'text-red-400' : priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                    {priceImpact.toFixed(2)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {transactionStatus && (
                                <div className={`p-4 rounded-lg text-sm ${transactionStatus.includes('Error')
                                    ? 'bg-red-900/30 border border-red-700/50 text-red-300'
                                    : transactionStatus.includes('successful')
                                        ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                                        : 'bg-blue-900/30 border border-blue-700/50 text-blue-300'
                                    }`}>
                                    <div className="flex items-start">
                                        {transactionStatus.includes('Error') ? (
                                            <IconError className="h-5 w-5 mr-2 text-red-400 mt-0.5 flex-shrink-0" />
                                        ) : transactionStatus.includes('successful') ? (
                                            <IconSuccess className="h-5 w-5 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <IconInfo className="h-5 w-5 mr-2 text-blue-400 mt-0.5 flex-shrink-0" />
                                        )}
                                        <p className="break-all">{transactionStatus}</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleBuyTokens}
                                disabled={loading || !amount || fetchingPrice || fetchError}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-lg font-semibold text-sm shadow-lg hover:shadow-purple-700/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <LoadingSpinner size="sm" color="white" />
                                        <span className="ml-2">Processing...</span>
                                    </div>
                                ) : 'Buy Tokens'}
                            </button>

                            <div className="text-center text-xs text-gray-400 mt-3">
                                Tokens will be automatically sent to your connected wallet
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyTokens;