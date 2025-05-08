import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import CreateToken from '../components/CreateToken';
import BuyTokens from '../components/BuyTokens';
import SellTokens from '../components/SellTokens';
import TokenBalance from '../components/TokenBalance';
import PoolInfo from '../components/PoolInfo';
import AnimatedBackground from '../components/AnimatedBackground';
import { IconCoin } from '../components/Icons';
import Head from 'next/head';
import TokenTabs from '../components/TokenTabs';

export default function Home() {
    const [activeTab, setActiveTab] = useState('buy');
    const { publicKey } = useWallet();
    const [mounted, setMounted] = useState(false);

    // To avoid hydration issues with wallet adapter
    useEffect(() => {
        setMounted(true);
    }, []);

    const tabs = [
        { id: 'buy', label: 'Buy Tokens', component: <BuyTokens /> },
        { id: 'sell', label: 'Sell Tokens', component: <SellTokens /> },
        { id: 'pool', label: 'Pool Info', component: <PoolInfo /> },
        { id: 'create', label: 'Create Token (Admin)', component: <CreateToken /> }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
            <Head>
                <title>Solana Bonding Curve DEX | Pump.fun Style</title>
                <meta name="description" content="Trade tokens using an on-chain bonding curve with Solana" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Animated background */}
            <AnimatedBackground />

            <main className="container mx-auto px-4 py-12">
                <TokenTabs />
            </main>

            <footer className="border-t border-gray-800/80 mt-24 py-6 text-center text-gray-400 text-sm">
                <div className="container mx-auto px-4">
                    <p className="mb-2">Running on Solana Devnet • Not financial advice</p>
                    <p>Built with Next.js, Tailwind CSS, and Solana Web3.js</p>
                </div>
            </footer>
        </div>
    );
} 