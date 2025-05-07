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
        if (!currentPrice || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setEstimatedCost(null);
            return;
        }

        // Simple estimation based on current price
        // In a real bonding curve, this would be more complex based on the curve formula
        const cost = parseFloat(amount) * currentPrice;
        setEstimatedCost(cost);
    }, [amount, currentPrice]);

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

            setTransactionStatus('Transaction successful! Signature: ' + tx.slice(0, 8) + '...');
            setAmount('');
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
                <IconBuy className="h-5 w-5 mr-2 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Buy Tokens</h2>
            </div>
            <p className="text-gray-400 text-sm">Purchase tokens from the bonding curve at the current market price.</p>

            {!mounted ? (
                <div className="flex justify-center py-6">
                    <LoadingSpinner size="lg" color="indigo" />
                </div>
            ) : !publicKey ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                    <div className="bg-indigo-900/30 backdrop-blur-md p-5 rounded-xl border border-indigo-800/40 max-w-md w-full text-center">
                        <IconLock className="h-8 w-8 mx-auto mb-2 text-indigo-400" />
                        <p className="text-gray-300 mb-4">Connect your wallet to access the token market</p>
                        <WalletMultiButton />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 p-5 rounded-xl border border-indigo-800/40 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-indigo-300 mb-2">Current Market Price</h3>
                                {fetchingPrice ? (
                                    <div className="animate-pulse h-8 w-44 bg-indigo-900/30 rounded"></div>
                                ) : fetchError ? (
                                    <div className="text-red-400 text-sm flex items-center">
                                        <IconError className="h-4 w-4 mr-1" />
                                        Error loading price data
                                    </div>
                                ) : currentPrice !== null ? (
                                    <p className="text-2xl font-bold text-white">{currentPrice.toFixed(6)} <span className="text-sm font-normal text-indigo-300">SOL</span></p>
                                ) : (
                                    <div className="text-yellow-400 text-sm flex items-center">
                                        <IconInfo className="h-4 w-4 mr-1" />
                                        Waiting for price data...
                                    </div>
                                )}
                                <p className="text-xs text-indigo-400 mt-1">
                                    Price increases as more tokens are purchased
                                </p>
                            </div>
                            <div className="flex items-center">
                                <NetworkBadge network="devnet" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 bg-gray-800/40 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50 shadow-md">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                                Amount to Buy
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="block w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800/80 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200"
                                    disabled={loading}
                                />
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <span className="text-gray-400 sm:text-sm">tokens</span>
                                </div>
                            </div>
                        </div>

                        {estimatedCost !== null && currentPrice !== null && (
                            <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-300">Estimated Cost:</span>
                                    <span className="text-lg font-semibold text-white">
                                        {estimatedCost.toFixed(6)} SOL
                                    </span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-700/50">
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <span>Base Price:</span>
                                        <span>{currentPrice.toFixed(6)} SOL per token</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {transactionStatus && (
                            <div className={`p-4 rounded-lg text-sm ${transactionStatus.includes('Error')
                                ? 'status-error'
                                : transactionStatus.includes('successful')
                                    ? 'status-success'
                                    : 'status-info'
                                }`}>
                                <div className="flex items-center">
                                    {transactionStatus.includes('Error') ? (
                                        <IconError className="h-5 w-5 mr-2 text-red-400" />
                                    ) : transactionStatus.includes('successful') ? (
                                        <IconSuccess className="h-5 w-5 mr-2 text-green-400" />
                                    ) : (
                                        <IconInfo className="h-5 w-5 mr-2 text-blue-400" />
                                    )}
                                    <p>{transactionStatus}</p>
                                </div>

                                {transactionStatus.includes('Signature') && (
                                    <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-end">
                                        <a
                                            href={`https://explorer.solana.com/tx/${transactionStatus.split('Signature: ')[1].split('...')[0]}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/60 px-2.5 py-1.5 rounded-md transition-colors flex items-center"
                                        >
                                            <IconExternal className="h-3.5 w-3.5 mr-1" />
                                            View on Explorer
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleBuyTokens}
                            disabled={loading || !amount || currentPrice === null}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-lg font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <LoadingSpinner size="sm" color="white" />
                                    <span className="ml-2">Processing...</span>
                                </div>
                            ) : 'Buy Tokens'}
                        </button>
                    </div>

                    <div className="text-xs text-gray-500 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                        <div className="flex items-start space-x-2">
                            <IconInfo className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                            <p>
                                This bonding curve uses a linear pricing model where the token price increases as more tokens are purchased. Tokens are minted on-demand when purchased and burned when sold back to the curve.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyTokens;