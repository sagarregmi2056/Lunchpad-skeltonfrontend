import { 
    Connection, 
    PublicKey, 
    Keypair, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    Transaction,
    sendAndConfirmTransaction 
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID,
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    createInitializeMintInstruction,
    MINT_SIZE,
} from '@solana/spl-token';
import { createTokenMetadata } from './tokenMetadata';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export const createToken = async (wallet, { decimals, initialMintAmount }) => {
    try {
        // Validate parameters
        if (!Number.isInteger(decimals) || decimals < 0) {
            throw new Error('Invalid decimals: must be a non-negative integer');
        }
        if (!Number.isFinite(initialMintAmount) || initialMintAmount <= 0) {
            throw new Error('Invalid initialMintAmount: must be a positive number');
        }

        // Convert wallet.publicKey to a PublicKey object
        const walletPubkey = new PublicKey(wallet.publicKey);

        // Create mint account
        const mintAuthority = walletPubkey;
        const freezeAuthority = walletPubkey;
        
        // Create mint account with specified decimals
        const mint = await createMint(
            connection,
            wallet, // payer
            mintAuthority, // mintAuthority
            freezeAuthority, // freezeAuthority
            decimals // decimals
        );

        console.log('Token Mint Address:', mint.toBase58());

        // Get the token account of the wallet address, and if it does not exist, create it
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            mint,
            walletPubkey
        );

        console.log('Token Account Address:', tokenAccount.address.toBase58());

        // Mint initial tokens to the token account
        const tokens = initialMintAmount * Math.pow(10, decimals);
        await mintTo(
            connection,
            wallet,
            mint,
            tokenAccount.address,
            mintAuthority,
            tokens
        );

        console.log('Successfully minted tokens');
        
        return {
            tokenMint: mint.toBase58(),
            tokenAccount: tokenAccount.address.toBase58()
        };
    } catch (error) {
        console.error('Error creating token:', error);
        throw error;
    }
};

export const createTokenWithMetadata = async (
    connection,
    wallet,
    {
        decimals,
        name,
        symbol,
        uri,
    }
) => {
    try {
        // Validate parameters
        if (!Number.isInteger(decimals) || decimals < 0) {
            throw new Error('Invalid decimals: must be a non-negative integer');
        }
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw new Error('Invalid name: must be a non-empty string');
        }
        if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
            throw new Error('Invalid symbol: must be a non-empty string');
        }
        if (typeof uri !== 'string') {
            throw new Error('Invalid uri: must be a string');
        }

        // Convert wallet.publicKey to a PublicKey object
        const walletPubkey = wallet.publicKey instanceof PublicKey 
            ? wallet.publicKey 
            : new PublicKey(wallet.publicKey);
        console.log('Wallet Pubkey:', walletPubkey);

        // Generate a new mint keypair
        const mintKeypair = Keypair.generate();
        console.log('Mint Keypair:', mintKeypair);
        const mintPubkey = mintKeypair.publicKey;

        // Calculate the lamports needed for rent exemption
        const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

        // Create instructions for the transaction
        const instructions = [];
        
        // Create account instruction
        instructions.push(
            SystemProgram.createAccount({
                fromPubkey: walletPubkey,
                newAccountPubkey: mintPubkey,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            })
        );
        
        // Initialize mint instruction
        instructions.push(
            createInitializeMintInstruction(
                mintPubkey,
                decimals,
                walletPubkey,
                walletPubkey,
                TOKEN_PROGRAM_ID
            )
        );

        // Add metadata instruction
        const metadataInstruction = await createTokenMetadata(
            connection,
            {
                publicKey: walletPubkey,
                signTransaction: wallet.signTransaction.bind(wallet),
                signMessage: wallet.signMessage.bind(wallet),
            },
            mintPubkey,
            name,
            symbol,
            uri
        );
        
        if (metadataInstruction) {
            instructions.push(metadataInstruction);
        }

        // Create transaction
        const transaction = new Transaction();
        transaction.feePayer = walletPubkey;
        
        // Get the latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        
        // Add all instructions to the transaction
        instructions.forEach(instruction => {
            if (instruction) {
                transaction.add(instruction);
            }
        });

        // Sign with the mint keypair
        transaction.partialSign(mintKeypair);

        // Get the transaction signed by the wallet
        const signedTx = await wallet.signTransaction(transaction);

        // Send and confirm transaction with retry logic
        let signature;
        try {
            signature = await connection.sendRawTransaction(signedTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 5
            });
            
            // Wait for confirmation with specific parameters
            await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');
        } catch (error) {
            console.error('Transaction error:', error);
            if (error.message.includes('Blockhash not found')) {
                // If blockhash error, retry with a new blockhash
                const { blockhash: newBlockhash, lastValidBlockHeight: newHeight } = 
                    await connection.getLatestBlockhash();
                transaction.recentBlockhash = newBlockhash;
                transaction.signatures = [];
                transaction.partialSign(mintKeypair);
                
                const newSignedTx = await wallet.signTransaction(transaction);
                signature = await connection.sendRawTransaction(newSignedTx.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                    maxRetries: 5
                });
                
                await connection.confirmTransaction({
                    signature,
                    blockhash: newBlockhash,
                    lastValidBlockHeight: newHeight
                }, 'confirmed');
            } else {
                throw error;
            }
        }

        return {
            mint: mintPubkey.toBase58(),
            signature,
            success: true
        };
    } catch (error) {
        console.error('Error creating token:', error);
        return {
            success: false,
            error: error.message
        };
    }
};