import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { ChakraProvider, theme } from '@chakra-ui/react';
import '../styles/globals.css';
import '../styles/wallet-adapter.css';

// Extend the theme to include custom colors, fonts, etc
const colors = {
    brand: {
        900: '#1a365d',
        800: '#153e75',
        700: '#2a69ac',
    },
};

const customTheme = {
    ...theme,
    colors: {
        ...theme.colors,
        ...colors,
    },
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
};

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
        <>
            <ChakraProvider theme={customTheme} resetCSS>
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
        </>
    );

    return mounted ? renderApp : <div className="h-screen bg-gray-900"></div>;
}