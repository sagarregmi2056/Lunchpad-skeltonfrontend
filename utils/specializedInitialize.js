import { AnchorProvider, Program, BN } from '@project-serum/anchor';
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import idl from './idl.json';

// The program ID matches the one in anchorClient.js
export const PROGRAM_ID = new PublicKey('ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4');

// Bonding curve seed
const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

// Get Solana explorer URL
export const getExplorerUrl = (address, cluster = 'devnet') => {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
};

// Specialized initialize function that's more robust with the IDL
export const initializeTokenBondingCurve = async (wallet, initialPrice, slope, tokenMint) => {
  try {
    console.log('Specialized initialize function called');
    
    // Validate inputs
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    if (!tokenMint) {
      throw new Error('Token mint address is required');
    }
    
    // Convert tokenMint to PublicKey if it's a string
    const tokenMintPubkey = typeof tokenMint === 'string' 
      ? new PublicKey(tokenMint) 
      : tokenMint;
    
    console.log('Token mint:', tokenMintPubkey.toString());
    console.log('Initial price:', initialPrice.toString());
    console.log('Slope:', slope.toString());
    
    // Create connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Create manually corrected IDL (to avoid the type errors in the normal IDL)
    const manualIdl = {
      ...idl,
      types: [
        {
          name: "BondingCurve",
          type: {
            kind: "struct",
            fields: [
              { name: "authority", type: "publicKey" },
              { name: "initialPrice", type: "u64" },
              { name: "slope", type: "u64" },
              { name: "totalSupply", type: "u64" },
              { name: "tokenMint", type: "publicKey" },
              { name: "bump", type: "u8" }
            ]
          }
        }
      ],
      instructions: [
        {
          name: "initialize",
          accounts: [
            { name: "bondingCurve", isMut: true, isSigner: false },
            { name: "authority", isMut: true, isSigner: true },
            { name: "tokenMint", isMut: false, isSigner: false },
            { name: "systemProgram", isMut: false, isSigner: false }
          ],
          args: [
            { name: "initialPrice", type: "u64" },
            { name: "slope", type: "u64" }
          ]
        }
      ]
    };
    
    // Create provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions
      },
      { commitment: 'confirmed' }
    );
    
    // Create program with the manually fixed IDL
    const program = new Program(manualIdl, PROGRAM_ID, provider);
    
    // Find PDA
    const [bondingCurveAddress, bump] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, tokenMintPubkey.toBuffer()],
      PROGRAM_ID
    );
    
    console.log('Bonding curve PDA:', bondingCurveAddress.toString());
    
    // Check if account already exists
    const accountInfo = await connection.getAccountInfo(bondingCurveAddress);
    if (accountInfo !== null) {
      console.log('Bonding curve already exists');
      return {
        success: true,
        message: 'Bonding curve already exists',
        address: bondingCurveAddress.toString(),
        explorerUrl: getExplorerUrl(bondingCurveAddress.toString())
      };
    }
    
    // Call initialize with retries and error handling
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1}/${maxAttempts} to initialize bonding curve`);
        
        // Build transaction
        const tx = await program.methods
          .initialize(
            initialPrice,
            slope
          )
          .accounts({
            bondingCurve: bondingCurveAddress,
            authority: wallet.publicKey,
            tokenMint: tokenMintPubkey,
            systemProgram: SystemProgram.programId
          })
          .rpc({ commitment: 'confirmed' });
        
        console.log('Transaction successful:', tx);
        
        // Return success
        return {
          success: true,
          signature: tx,
          address: bondingCurveAddress.toString(),
          explorerUrl: getExplorerUrl(bondingCurveAddress.toString())
        };
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempts + 1} failed:`, error);
        
        // If it's an IDL error, try a different approach on next attempt
        if (error.message.includes('undefined') || error.message.includes('t is undefined')) {
          console.log('IDL error detected, trying alternative approach on next attempt');
          // Modify IDL fields between attempts if needed
        }
        
        attempts++;
        
        // Wait before retrying
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    // If we're here, all attempts failed
    throw new Error(`Failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
    
  } catch (error) {
    console.error('Error in specialized initialize function:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Alternative initialization with raw instructions
export const initializeWithRawInstructions = async (wallet, initialPrice, slope, tokenMint) => {
  try {
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    const tokenMintPubkey = typeof tokenMint === 'string' 
      ? new PublicKey(tokenMint) 
      : tokenMint;
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Find PDA
    const [bondingCurveAddress, bump] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, tokenMintPubkey.toBuffer()],
      PROGRAM_ID
    );
    
    // Create raw instruction data using Buffer
    const instructionLayout = {
      initialize: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]) // The discriminator from IDL
    };
    
    // Build instruction data manually
    const dataLayout = Buffer.alloc(8 + 8 + 8); // 8 bytes for discriminator + 8 bytes for u64 initialPrice + 8 bytes for u64 slope
    
    // Write discriminator
    instructionLayout.initialize.copy(dataLayout, 0);
    
    // Write initialPrice (u64) - need to properly serialize this
    const initialPriceBuffer = Buffer.alloc(8);
    initialPriceBuffer.writeBigUInt64LE(BigInt(initialPrice.toString()), 0);
    initialPriceBuffer.copy(dataLayout, 8);
    
    // Write slope (u64)
    const slopeBuffer = Buffer.alloc(8);
    slopeBuffer.writeBigUInt64LE(BigInt(slope.toString()), 0);
    slopeBuffer.copy(dataLayout, 16);
    
    // Create raw transaction
    const transaction = new Transaction();
    
    transaction.add({
      keys: [
        { pubkey: bondingCurveAddress, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: tokenMintPubkey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: PROGRAM_ID,
      data: dataLayout
    });
    
    // Send transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    
    // Sign and send
    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    
    return {
      success: true,
      signature,
      address: bondingCurveAddress.toString(),
      explorerUrl: getExplorerUrl(bondingCurveAddress.toString())
    };
    
  } catch (error) {
    console.error('Error in raw instruction initialization:', error);
    return {
      success: false,
      error: error.message
    };
  }
};