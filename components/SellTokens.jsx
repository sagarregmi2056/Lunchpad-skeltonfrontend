import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorProgram, TOKEN_MINT } from '../utils/anchorClient';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SystemProgram, PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';

const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

const SellTokens = () => {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [transactionStatus, setTransactionStatus] = useState('');
    const [estimatedReturn, setEstimatedReturn] = useState(null);
    const { program, provider, userTokenAccount, bondingCurvePDA } = useAnchorProgram();
    const { publicKey } = useWallet();
    const [mounted, setMounted] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(null);

    // Handle wallet adapter hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch the current price when the component loads
    useEffect(() => {
        const fetchCurrentPrice = async () => {
            if (!program || !bondingCurvePDA) return;

            try {
                // Get the bonding curve account data
                const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);

                // Safely handle large numbers by using toString instead of toNumber
                const initialPriceBN = bondingCurveAccount.initialPrice.toString();
                const slopeBN = bondingCurveAccount.slope.toString();
                const totalSupplyBN = bondingCurveAccount.totalSupply.toString();

                // Calculate the current price - convert strings to numbers safely
                const initialPrice = parseFloat(initialPriceBN) / 1e9;
                const slope = parseFloat(slopeBN) / 1e9;
                const supply = parseFloat(totalSupplyBN) / 1e9;

                const price = initialPrice + (slope * supply);
                setCurrentPrice(price);
            } catch (error) {
                console.error('Error fetching current price:', error);
            }
        };

        fetchCurrentPrice();

        // Refresh the price every 10 seconds
        const intervalId = setInterval(fetchCurrentPrice, 10000);
        return () => clearInterval(intervalId);
    }, [program, bondingCurvePDA]);

    // Calculate the estimated return when amount changes
    useEffect(() => {
        if (!currentPrice || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setEstimatedReturn(null);
            return;
        }

        // Simple estimation based on current price
        const returnAmount = parseFloat(amount) * currentPrice;
        setEstimatedReturn(returnAmount);
    }, [amount, currentPrice]);

    const handleSellTokens = async () => {
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

            // Call your program's sell tokens instruction
            const tx = await program.methods
                .sellTokens(amountBN)
                .accounts({
                    bondingCurve: bondingCurve,
                    authority: provider.wallet.publicKey, // The program authority
                    seller: provider.wallet.publicKey,
                    sellerTokenAccount: userTokenAccount,
                    tokenMint: TOKEN_MINT,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId
                })
                .rpc();

            setTransactionStatus('Transaction successful! Signature: ' + tx.slice(0, 8) + '...');
            setAmount('');
        } catch (error) {
            console.error('Error selling tokens:', error);
            setTransactionStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 text-gray-200">
            <h2 className="text-xl font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                </svg>
                Sell Tokens
            </h2>
            <p className="text-gray-400 text-sm">Sell your tokens back to the bonding curve at the current market price.</p>

            {!mounted ? (
                <div className="flex justify-center py-6">
                    <div className="animate-pulse h-10 w-40 bg-gray-800 rounded-lg"></div>
                </div>
            ) : !publicKey ? (
                <div className="flex flex-col items-center py-8 space-y-4">
                    <div className="bg-indigo-900/30 backdrop-blur-md p-5 rounded-xl border border-indigo-800/40 max-w-md w-full text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <p className="text-gray-300 mb-4">Connect your wallet to access your tokens</p>
                        <WalletMultiButton />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 p-5 rounded-xl border border-indigo-800/40 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-indigo-300 mb-2">Current Market Price</h3>
                                {currentPrice !== null ? (
                                    <p className="text-2xl font-bold text-white">{currentPrice.toFixed(6)} <span className="text-sm font-normal text-indigo-300">SOL</span></p>
                                ) : (
                                    <div className="animate-pulse h-8 w-44 bg-indigo-900/30 rounded"></div>
                                )}
                                <p className="text-xs text-indigo-400 mt-1">
                                    Price decreases as more tokens are sold back
                                </p>
                            </div>
                            <div className="px-3 py-1.5 bg-indigo-900/40 rounded-full border border-indigo-700/40">
                                <p className="text-xs font-medium text-indigo-300">Network: <span className="text-green-400">Devnet</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5 bg-gray-800/40 backdrop-blur-sm p-5 rounded-xl border border-gray-700/50 shadow-md">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                                Amount to Sell
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

                        {estimatedReturn !== null && (
                            <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-300">Estimated Return:</span>
                                    <span className="text-lg font-semibold text-white">
                                        {estimatedReturn.toFixed(6)} SOL
                                    </span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-700/50">
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <span>Current Price:</span>
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    ) : transactionStatus.includes('successful') ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
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
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            View on Explorer
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleSellTokens}
                            disabled={loading || !amount}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-lg font-semibold text-sm hover:from-purple-500 hover:to-indigo-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </div>
                            ) : 'Sell Tokens'}
                        </button>
                    </div>

                    <div className="text-xs text-gray-500 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                        <div className="flex items-start space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p>
                                When you sell tokens, they are burned from circulation and you receive SOL based on the current token price. The price decreases slightly for subsequent sellers.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellTokens;