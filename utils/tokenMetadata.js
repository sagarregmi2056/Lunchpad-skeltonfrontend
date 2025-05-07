import { createMetadataAccountV3 } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { none } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey, toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey, Connection } from '@solana/web3.js';

export const createTokenMetadata = async (
    connection,
    wallet,
    mint,
    name,
    symbol,
    uri
) => {
    try {
        // Validate wallet
        if (!wallet.publicKey || !wallet.signTransaction) {
            throw new Error('Wallet not connected or missing required methods');
        }

        // Create base Umi instance
        const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());

        // Convert wallet public key to UMI format
        const walletPubkey = wallet.publicKey instanceof PublicKey 
            ? wallet.publicKey 
            : new PublicKey(wallet.publicKey);
        const walletUmi = fromWeb3JsPublicKey(walletPubkey);
        console.log('Wallet Pubkey:', walletPubkey);

        // Set up the wallet adapter as the signer
        umi.identity = {
            publicKey: walletUmi,
            signMessage: wallet.signMessage,
            signTransaction: wallet.signTransaction,
        };
        umi.payer = umi.identity;
        console.log('Umi Identity:', umi.identity);

        // Convert the mint public key to UMI format
        const mintPublicKey = mint instanceof PublicKey ? mint : new PublicKey(mint);
        const mintUmi = fromWeb3JsPublicKey(mintPublicKey);
        console.log('Mint Umi:', mintUmi);

        // Create metadata arguments
        const metadataArgs = {
            mint: mintUmi,
            authority: walletUmi,
            data: {
                name,
                symbol,
                uri,
                sellerFeeBasisPoints: 0,
                creators: none(),
                collection: none(),
                uses: none(),
            },
            isMutable: true,
            collectionDetails: none(),
        };

        // Create the metadata instruction
        const builder = await createMetadataAccountV3(umi, metadataArgs).getInstructions();
        console.log('Builder:', builder);

        if (!builder || builder.length === 0) {
            throw new Error('Failed to create metadata instruction');
        }

        // Convert the UMI instruction to a web3.js instruction
        const web3Instruction = toWeb3JsInstruction(builder[0]);
        return web3Instruction;
    } catch (error) {
        console.error('Error in createTokenMetadata:', error);
        throw error;
    }
};