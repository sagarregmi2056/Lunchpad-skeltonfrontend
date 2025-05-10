import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { ChakraProvider } from '@chakra-ui/react';
import { extendTheme } from '@chakra-ui/theme-utils';
import '../styles/globals.css';
import '../styles/wallet-adapter.css';

// Extend the theme to include custom colors, fonts, etc
const theme = extendTheme({
    config: {
        initialColorMode: 'dark',
        useSystemColorMode: false,
    },
    styles: {
        global: {
            body: {
                bg: 'gray.900',
                color: 'white',
            },
        },
    },
});

export default function MyApp({ Component, pageProps }) {
    const [mounted, setMounted] = useState(false);

    // Set up network and endpoint
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    
    // Set up supported wallets (limiting to most popular ones)
    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter()
    ];

    // Prevent wallet auto-connection issues by ensuring client-side only rendering
    useEffect(() => {
        setMounted(true);
    }, []);

    // Only render wallet components on client-side
    const renderApp = (
        <ChakraProvider theme={theme}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect={false} onError={(error) => {
                    console.error('Wallet error:', error);
                    // Don't show alerts to users
                }}>
                    <WalletModalProvider>
                        <Head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <meta name="theme-color" content="#4F46E5" />
                            <meta property="og:title" content="CurveLaunch | Tokens that grow with demand" />
                            <meta property="og:description" content="Launch tokens with automatic price discovery using bonding curves on Solana" />
                            <meta property="og:image" content="/og-image.svg" />
                            <meta property="twitter:card" content="summary_large_image" />
                        </Head>
                        <Component {...pageProps} />
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </ChakraProvider>
    );

    return mounted ? renderApp : <div className="h-screen bg-gray-900"></div>;
}