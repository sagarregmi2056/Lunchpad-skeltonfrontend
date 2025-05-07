import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '../styles/globals.css';
import '../styles/wallet-adapter.css';

export default function MyApp({ Component, pageProps }) {
    // Set up network and endpoint
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    
    // Set up supported wallets (limiting to most popular ones)
    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter()
    ];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect={false}>
                <WalletModalProvider>
                    <Component {...pageProps} />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}