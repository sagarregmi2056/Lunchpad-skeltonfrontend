import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@chakra-ui/next-js'
import theme from '../theme'
import '../styles/globals.css';
import '../styles/wallet-adapter.css';

export default function MyApp({ Component, pageProps }) {
    const [mounted, setMounted] = useState(false);

    // Set up network and endpoint
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    
    // Set up supported wallets
    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter()
    ];

    useEffect(() => {
        setMounted(true);
    }, []);

    const renderApp = (
        <CacheProvider>
            <ChakraProvider theme={theme}>
                <ConnectionProvider endpoint={endpoint}>
                    <WalletProvider wallets={wallets} autoConnect={false} onError={(error) => {
                        console.error('Wallet error:', error);
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
        </CacheProvider>
    );

    return mounted ? renderApp : <div style={{ height: '100vh', backgroundColor: '#1A202C' }} />;
}