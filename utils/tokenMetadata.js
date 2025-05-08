import { createMetadataAccountV3, findMetadataPda } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { none, publicKey as publicKeyUmi, struct, string } from '@metaplex-foundation/umi';
import { fromWeb3JsPublicKey, toWeb3JsInstruction, fromWeb3JsTransaction } from '@metaplex-foundation/umi-web3js-adapters';
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
        const umi = createUmi(connection.rpcEndpoint)
            .use(mplTokenMetadata());

        // Convert wallet public key to UMI format
        const walletPubkey = wallet.publicKey instanceof PublicKey 
            ? wallet.publicKey 
            : new PublicKey(wallet.publicKey);
        const walletUmi = fromWeb3JsPublicKey(walletPubkey);
        console.log('Wallet Pubkey:', walletPubkey.toBase58());

        // Create a proper UMI identity with all required methods
        umi.identity = {
            publicKey: walletUmi,
            signMessage: async (message) => {
                return await wallet.signMessage(message);
            },
            signTransaction: async (transaction) => {
                return await wallet.signTransaction(transaction);
            },
            signAllTransactions: async (transactions) => {
                if (wallet.signAllTransactions) {
                    return await wallet.signAllTransactions(transactions);
                }
                throw new Error('Wallet does not support signAllTransactions');
            },
        };
        
        umi.payer = umi.identity;
        console.log('Umi Identity:', umi.identity.publicKey);

        // Convert the mint public key to UMI format
        const mintPublicKey = mint instanceof PublicKey ? mint : new PublicKey(mint);
        const mintUmi = fromWeb3JsPublicKey(mintPublicKey);
        console.log('Mint Umi:', mintUmi);
        
        // Get the correct metadata PDA using the Metaplex helper
        const metadataPda = findMetadataPda(umi, { mint: mintUmi });
        console.log('Metadata PDA:', metadataPda);

        // Create the metadata instruction with proper context
        const builder = createMetadataAccountV3(umi, {
            metadata: metadataPda,
            mint: mintUmi,
            mintAuthority: walletUmi,
            payer: walletUmi,
            updateAuthority: walletUmi,
            data: {
                name,
                symbol,
                uri: uri || '',
                sellerFeeBasisPoints: 0,
                creators: none(),
                collection: none(),
                uses: none(),
            },
            isMutable: true,
            collectionDetails: none(),
        });
        
        // Get instructions
        const instructions = await builder.getInstructions();
        console.log('Instruction count:', instructions.length);

        if (!instructions || instructions.length === 0) {
            throw new Error('Failed to create metadata instruction');
        }

        // Convert the UMI instruction to a web3.js instruction
        const web3Instruction = toWeb3JsInstruction(instructions[0]);
        return web3Instruction;
    } catch (error) {
        console.error('Error in createTokenMetadata:', error);
        throw error;
    }
};