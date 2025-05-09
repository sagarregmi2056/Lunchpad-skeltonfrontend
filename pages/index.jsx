import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Head from 'next/head';
import AnimatedBackground from '../components/AnimatedBackground';
import Link from 'next/link';

export default function Landing() {
    const [mounted, setMounted] = useState(false);
    const { publicKey } = useWallet();
    const router = useRouter();

    // To avoid hydration issues with wallet adapter
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 text-white">
            <Head>
                <title>CurveLaunch | Tokens that grow with demand</title>
                <meta name="description" content="Launch tokens with automatic price discovery using bonding curves on Solana" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Enhanced Animated background with slower, more deliberate movement */}
            <AnimatedBackground className="opacity-60" />

            {/* Hero Section */}
            <main className="container mx-auto px-4 py-12">
                <header className="flex items-center justify-between py-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-purple-500/20 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                                <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">CurveLaunch</h1>
                            <p className="text-purple-300 text-xs">Launch tokens that grow with demand</p>
                        </div>
                    </div>

                    {mounted && (
                        <div className="flex items-center gap-4">
                            <div className="hidden md:block bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-800/40 backdrop-blur-sm">
                                <p className="text-xs font-medium text-purple-300">Network: <span className="text-green-400">Devnet</span></p>
                            </div>
                            {publicKey && (
                                <Link
                                    href="/admin/create-token"
                                    className="bg-purple-800/50 hover:bg-purple-700/60 text-white px-3 py-2 rounded-lg text-sm border border-purple-700/40 transition flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                    Admin
                                </Link>
                            )}
                            <WalletMultiButton className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg hover:shadow-purple-700/20 transition" />
                        </div>
                    )}
                </header>

                <div className="mt-24 md:mt-32 max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-1/2 space-y-6">
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
                                Launch your token with automatic price discovery
                            </h2>
                            <p className="text-gray-300 text-lg">
                                CurveLaunch uses bonding curves to ensure your token's price automatically
                                adjusts with market demand. No liquidity, no problem.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link
                                    href="/my-tokens"
                                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-purple-700/20 transition transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                                >
                                    Launch App
                                </Link>
                                <a
                                    href="https://docs.solana.com/developing/clients/javascript-api"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white px-8 py-3 rounded-lg font-medium text-lg border border-gray-700/50 transition transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                                >
                                    Learn More
                                </a>
                            </div>
                        </div>

                        {/* Curve Visualization */}
                        <div className="w-full md:w-1/2 p-6 bg-gray-800/30 backdrop-blur-md rounded-2xl border border-purple-900/30 shadow-xl">
                            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-gray-900 to-purple-900/40 overflow-hidden relative">
                                {/* Animated Curve Graph */}
                                <svg className="w-full h-full" viewBox="0 0 400 300">
                                    <defs>
                                        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="rgba(167, 139, 250, 0.8)" />
                                            <stop offset="100%" stopColor="rgba(139, 92, 246, 0.2)" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid lines */}
                                    <g className="grid-lines" stroke="rgba(147, 51, 234, 0.1)" strokeWidth="1">
                                        {[...Array(6)].map((_, i) => (
                                            <line key={`h-${i}`} x1="0" y1={50 * i} x2="400" y2={50 * i} />
                                        ))}
                                        {[...Array(9)].map((_, i) => (
                                            <line key={`v-${i}`} x1={50 * i} y1="0" x2={50 * i} y2="300" />
                                        ))}
                                    </g>

                                    {/* Curve - Quadratic y = x^2/2 + 50 */}
                                    <path
                                        d="M 0,250 Q 100,220 200,150 Q 300,50 400,0"
                                        fill="none"
                                        stroke="rgba(167, 139, 250, 0.8)"
                                        strokeWidth="3"
                                    />

                                    {/* Area under curve */}
                                    <path
                                        d="M 0,250 Q 100,220 200,150 Q 300,50 400,0 L 400,300 L 0,300 Z"
                                        fill="url(#curveGradient)"
                                        opacity="0.3"
                                    />

                                    {/* Pulsing dot on curve */}
                                    <circle cx="200" cy="150" r="6" fill="#d8b4fe" className="animate-pulse" />
                                </svg>

                                {/* Labels */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-purple-300 font-medium">
                                    Token Supply
                                </div>
                                <div className="absolute top-1/2 left-4 -translate-y-1/2 text-xs text-purple-300 font-medium transform -rotate-90">
                                    Token Price
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-sm text-purple-300">Automatic price discovery</p>
                                <p className="text-sm text-purple-300">Always tradable</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="mt-32 max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Why launch with CurveLaunch?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-gradient-to-br from-gray-800/40 to-purple-900/20 backdrop-blur-md p-6 rounded-xl border border-purple-900/30 shadow-lg hover:shadow-purple-800/10 transition-shadow duration-300">
                            <div className="h-12 w-12 bg-purple-900/40 rounded-lg flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
                                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM9 7.5A.75.75 0 009 9h1.5c.398 0 .75.302.75.75v1.5c0 .414-.336.75-.75.75h-1.5a.75.75 0 000 1.5h1.5c.398 0 .75.302.75.75V15a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5v-1.5H9a.75.75 0 010-1.5h3V9.75H9V7.5z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Automatic Price Discovery</h3>
                            <p className="text-gray-300">Bonding curves ensure your token's price adjusts automatically with supply and demand. No need for market makers.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-gradient-to-br from-gray-800/40 to-purple-900/20 backdrop-blur-md p-6 rounded-xl border border-purple-900/30 shadow-lg hover:shadow-purple-800/10 transition-shadow duration-300">
                            <div className="h-12 w-12 bg-purple-900/40 rounded-lg flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
                                    <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
                                    <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
                                    <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
                                    <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Always Backed, Always Liquid</h3>
                            <p className="text-gray-300">Tokens are always backed by SOL in the bonding curve contract. Buy and sell at any time with zero liquidity concerns.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-gradient-to-br from-gray-800/40 to-purple-900/20 backdrop-blur-md p-6 rounded-xl border border-purple-900/30 shadow-lg hover:shadow-purple-800/10 transition-shadow duration-300">
                            <div className="h-12 w-12 bg-purple-900/40 rounded-lg flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
                                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Instant Trading</h3>
                            <p className="text-gray-300">Instant transactions on Solana with no slippage. No waiting for order books or liquidity pools.</p>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="mt-28 max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-purple-900/20 backdrop-blur-md rounded-xl border border-purple-800/30 p-6 text-center">
                            <h3 className="text-4xl font-bold text-white">10</h3>
                            <p className="text-purple-300 mt-2">Tokens Launched</p>
                        </div>

                        <div className="bg-purple-900/20 backdrop-blur-md rounded-xl border border-purple-800/30 p-6 text-center">
                            <h3 className="text-4xl font-bold text-white">230 SOL</h3>
                            <p className="text-purple-300 mt-2">Total Volume</p>
                        </div>

                        <div className="bg-purple-900/20 backdrop-blur-md rounded-xl border border-purple-800/30 p-6 text-center">
                            <h3 className="text-4xl font-bold text-white">5,380</h3>
                            <p className="text-purple-300 mt-2">Transactions</p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-28 max-w-4xl mx-auto text-center">
                    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-md p-10 rounded-2xl border border-purple-800/30 shadow-lg">
                        <h2 className="text-3xl font-bold mb-4">Ready to launch your token?</h2>
                        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                            Create your token in minutes with just a few clicks. No coding required,
                            no complex setup, just a simple and powerful way to launch on Solana.
                        </p>
                        <Link
                            href="/my-tokens"
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-purple-700/20 transition transform hover:-translate-y-0.5 active:translate-y-0 inline-block"
                        >
                            Launch Your Token
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="border-t border-gray-800/80 mt-28 py-8 text-center text-gray-400 text-sm">
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
} 