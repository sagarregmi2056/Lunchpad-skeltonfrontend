import Head from 'next/head';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import AnimatedBackground from './AnimatedBackground';
import { useRouter } from 'next/router';

const Layout = ({ children, title = 'CurveLaunch | Tokens that grow with demand' }) => {
    const { publicKey } = useWallet();
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Handle Next.js hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Navigation items
    const navItems = [
        { name: 'Home', path: '/' },
        { name: 'Create', path: '/create' },
        { name: 'Trade', path: '/trade' },
        { name: 'Admin', path: '/admin' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white">
            <Head>
                <title>{title}</title>
                <meta name="description" content="Launch tokens with automatic price discovery using bonding curves on Solana" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Animated background */}
            <AnimatedBackground />

            {/* Header */}
            <header className="border-b border-gray-800/80 py-4">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center space-x-3 group mr-8">
                                <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-glow-md group-hover:shadow-purple-500/30 transition-all duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                                        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">CurveLaunch</h1>
                                    <p className="text-purple-300 text-xs">Launch tokens that grow with demand</p>
                                </div>
                            </Link>

                            {/* Navigation */}
                            <nav className="hidden md:flex items-center space-x-6">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`text-sm font-medium transition-colors duration-200 hover:text-purple-400 ${router.pathname === item.path
                                            ? 'text-purple-400 relative after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-full after:bg-purple-500'
                                            : 'text-gray-300'
                                            }`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        {mounted && (
                            <div className="flex items-center space-x-4">
                                <div className="hidden md:block bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-800/40 backdrop-blur-sm">
                                    <p className="text-xs font-medium text-purple-300">Network: <span className="text-green-400">Devnet</span></p>
                                </div>
                                <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:shadow-purple-700/20 transition" />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile navigation bar (shown below header on small screens) */}
            <div className="md:hidden border-b border-gray-800/80 bg-gray-900/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-2">
                    <div className="flex justify-between items-center">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`text-xs font-medium py-2 flex flex-col items-center transition-colors duration-200 ${router.pathname === item.path
                                    ? 'text-purple-400'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                <span>{item.name}</span>
                                {router.pathname === item.path && (
                                    <span className="h-1 w-4 bg-purple-500 rounded-full mt-1"></span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800/80 mt-24 py-6 text-center text-gray-400 text-sm">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-center mb-4">
                        <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-purple-500/20 shadow-lg mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                                <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-white">CurveLaunch</span>
                    </div>
                    <p className="mb-2">Running on Solana Devnet • Not financial advice</p>
                    <p>Built with Next.js, Tailwind CSS, and Solana Web3.js</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout; 