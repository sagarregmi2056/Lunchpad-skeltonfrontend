import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_MINT, getOrCreateAssociatedTokenAccount } from '../utils/anchorClient';
import { getAccount } from '@solana/spl-token';
import { IconCoin, LoadingSpinner } from './Icons';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const TokenBalance = () => {
    const { publicKey } = useWallet();
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchBalance = async () => {
            if (!publicKey) return;

            try {
                setLoading(true);

                // Get the associated token account
                const tokenAccountAddress = await getOrCreateAssociatedTokenAccount(
                    publicKey,
                    TOKEN_MINT
                );

                // Get the token account info
                const tokenAccount = await getAccount(connection, tokenAccountAddress);

                // Format the balance with proper decimals (assuming 9 decimals)
                const formattedBalance = Number(tokenAccount.amount) / Math.pow(10, 9);

                setBalance(formattedBalance);
            } catch (error) {
                console.error('Error fetching token balance:', error);
                setBalance(0);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();

        // Set up an interval to refresh the balance every 15 seconds
        const intervalId = setInterval(fetchBalance, 15000);

        return () => clearInterval(intervalId);
    }, [publicKey]);

    if (!publicKey) return null;

    return (
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-5 flex justify-between items-center border border-indigo-800/50 hover:shadow-xl transition-shadow duration-300">
            <div>
                <h2 className="text-base sm:text-lg font-semibold text-indigo-300">Your Token Balance</h2>
                <div className="flex items-center mt-1.5">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                        <IconCoin className="h-5 w-5 text-white" />
                    </div>
                    {loading ? (
                        <div className="flex items-center">
                            <LoadingSpinner size="sm" color="indigo" />
                            <span className="ml-2 text-gray-400 text-sm">Loading...</span>
                        </div>
                    ) : (
                        <div className="text-2xl sm:text-3xl font-bold text-white">
                            {balance !== null ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) : '0.00'}
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-indigo-900/50 p-3 rounded-lg border border-indigo-800/50 glow">
                <IconCoin className="h-7 w-7 text-purple-400" />
            </div>
        </div>
    );
};

export default TokenBalance; 