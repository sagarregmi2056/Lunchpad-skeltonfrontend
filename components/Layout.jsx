import Head from 'next/head';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import AnimatedBackground from './AnimatedBackground';
import { IconCoin } from './Icons';

const Layout = ({ children, title = 'Solana Bonding Curve DEX' }) => {
    const { publicKey } = useWallet();
    const [mounted, setMounted] = useState(false);

    // Handle Next.js hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
            <Head>
                <title>{title}</title>
                <meta name="description" content="Trade tokens using an on-chain bonding curve with Solana" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Animated background */}
            <AnimatedBackground />

            {/* Header */}
            <header className="border-b border-gray-800/80 py-4">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-glow-md">
                                <IconCoin className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Bonding Curve DEX</h1>
                                <p className="text-gray-400 text-xs">Trade tokens with an on-chain price curve</p>
                            </div>
                        </div>

                        {mounted && (
                            <div className="flex items-center space-x-4">
                                <div className="bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-800/40 backdrop-blur-sm">
                                    <p className="text-xs font-medium text-purple-300">Network: <span className="text-green-400">Devnet</span></p>
                                </div>
                                <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:shadow-purple-700/20 transition" />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800/80 mt-24 py-6 text-center text-gray-400 text-sm">
                <div className="container mx-auto px-4">
                    <p className="mb-2">Running on Solana Devnet • Not financial advice</p>
                    <p>Built with Next.js, Tailwind CSS, and Solana Web3.js</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout; 