import { AnchorProvider, Program, BN } from '@project-serum/anchor';
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import idl from './idl.json';

// Your program ID
export const PROGRAM_ID = new PublicKey('ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4');

// Update this with your token mint address from the creation step
export const TOKEN_MINT = new PublicKey('EPD1phHBAgZNzJ85cGn3g2fV1YG22A9oWnYA2p99kvLk');

// Bonding curve seed
const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

// Local storage key for user tokens
const USER_TOKENS_KEY = 'userCreatedTokens';

// Get Solana explorer URL for a token
export const getExplorerUrl = (address, cluster = 'devnet') => {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
};

// Function to save created token
export const saveCreatedToken = (walletAddress, tokenData) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Get existing tokens
    const existingTokensStr = localStorage.getItem(USER_TOKENS_KEY) || '{}';
    const existingTokens = JSON.parse(existingTokensStr);
    
    // Add the token to the wallet's tokens
    if (!existingTokens[walletAddress]) {
      existingTokens[walletAddress] = [];
    }
    
    // Check if token already exists
    const exists = existingTokens[walletAddress].some(t => t.mint === tokenData.mint);
    if (!exists) {
      // Important note: In this design, there's only one bonding curve PDA for all tokens
      // So the bondingCurve value will be the same for all tokens
      existingTokens[walletAddress].push({
        ...tokenData,
        explorerUrl: getExplorerUrl(tokenData.mint),
        bondingCurveUrl: tokenData.bondingCurve ? getExplorerUrl(tokenData.bondingCurve) : null,
        createdAt: new Date().toISOString()
      });
    }
    
    // Save back to localStorage
    localStorage.setItem(USER_TOKENS_KEY, JSON.stringify(existingTokens));
    return true;
  } catch (error) {
    console.error('Error saving token to local storage:', error);
    return false;
  }
};

// Function to get user's created tokens
export const getUserCreatedTokens = (walletAddress) => {
  if (typeof window === 'undefined') return [];
  
  try {
    const tokensStr = localStorage.getItem(USER_TOKENS_KEY) || '{}';
    const tokens = JSON.parse(tokensStr);
    return tokens[walletAddress] || [];
  } catch (error) {
    console.error('Error getting tokens from local storage:', error);
    return [];
  }
};

// Initialize connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create a custom hook for Anchor initialization
export const useAnchorProgram = () => {
  const [program, setProgram] = useState(null);
  const [provider, setProvider] = useState(null);
  const [userTokenAccount, setUserTokenAccount] = useState(null);
  const [bondingCurvePDA, setBondingCurvePDA] = useState(null);
  const wallet = useWallet();

  useEffect(() => {
    const initializeAnchor = async () => {
      try {
        console.log('Wallet from anchorClient:', wallet);
        if (wallet.publicKey) {
          // Create a proper AnchorProvider
          const provider = new AnchorProvider(
            connection,
            {
              publicKey: wallet.publicKey,
              signTransaction: wallet.signTransaction,
              signAllTransactions: wallet.signAllTransactions,
            },
            AnchorProvider.defaultOptions()
          );
          
          const program = new Program(idl, PROGRAM_ID, provider);
          console.log('Program from anchorClient:', program);

          // Get the bonding curve PDA
          const [bondingCurveAddress] = await PublicKey.findProgramAddress(
            [BONDING_CURVE_SEED, TOKEN_MINT.toBuffer()],
            program.programId
          );
          
          // Get or create associated token account
          const tokenAccount = await getOrCreateAssociatedTokenAccount(
            wallet.publicKey,
            TOKEN_MINT
          );
          console.log('Token account from anchorClient:', tokenAccount);

          setProvider(provider);
          setProgram(program);
          setUserTokenAccount(tokenAccount);
          setBondingCurvePDA(bondingCurveAddress);
        }
      } catch (error) {
        console.error('Error initializing Anchor:', error);
      }
    };

    initializeAnchor();
  }, [wallet.publicKey]);

  return { program, provider, userTokenAccount, bondingCurvePDA };
};

// Function to get or create associated token account
export const getOrCreateAssociatedTokenAccount = async (owner, mint) => {
  try {
    const ownerPubkey = owner instanceof PublicKey ? owner : new PublicKey(owner);
    const mintPubkey = mint instanceof PublicKey ? mint : new PublicKey(mint);
    
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPubkey,
      ownerPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    try {
      // Check if the account exists
      await connection.getTokenAccountBalance(associatedTokenAddress);
      return associatedTokenAddress;
    } catch (error) {
      // If error, account doesn't exist, create it
      if (typeof window === 'undefined') {
        throw new Error('Unable to create token account outside of browser environment');
      }

      // For browser environments, request user to sign the transaction
      if (!window.solana) {
        throw new Error('Solana wallet not found. Please install a Solana wallet extension.');
      }

      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          ownerPubkey,
          associatedTokenAddress,
          ownerPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = ownerPubkey;
      
      // Request user to sign the transaction
      try {
        const signedTransaction = await window.solana.signTransaction(transaction);
        // Send the signed transaction
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        return associatedTokenAddress;
      } catch (err) {
        console.error('Error signing or sending transaction:', err);
        throw new Error(`Failed to create token account: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Error with token account:', error);
    throw error;
  }
};

// Add a function to check multiple PDA derivations
export const checkPdaDerivation = async (tokenMint) => {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const provider = new AnchorProvider(
      connection,
      {publicKey: new PublicKey(tokenMint)},
      AnchorProvider.defaultOptions()
    );
    
    const program = new Program(idl, PROGRAM_ID, provider);
    
    // Try multiple seed combinations
    const mintPubkey = new PublicKey(tokenMint);
    
    // 1. Just bonding_curve
    const [pda1] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED],
      program.programId
    );
    
    // 2. bonding_curve + mint address
    const [pda2] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, mintPubkey.toBuffer()],
      program.programId
    );
    
    // 3. bonding_curve + "token_name"
    const [pda3] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, Buffer.from("token_name")],
      program.programId
    );
    
    // 4. Just the mint key
    const [pda4] = await PublicKey.findProgramAddress(
      [mintPubkey.toBuffer()],
      program.programId
    );
    
    // 5. Try with a different string encoding 
    const [pda5] = await PublicKey.findProgramAddress(
      [Buffer.from("bonding_curve", "utf8")],
      program.programId
    );
    
    return {
      pda1: pda1.toString(),
      pda2: pda2.toString(),
      pda3: pda3.toString(),
      pda4: pda4.toString(),
      pda5: pda5.toString(),
      expected: "GX2VanNcKEpFhjpSVbrbEyXuPHPkt44LbQdHfey2Lue9"
    };
  } catch (error) {
    console.error("Error checking PDA derivation:", error);
    return { error: error.message };
  }
};

// Initialize bonding curve function
export const initializeBondingCurve = async (wallet, initialPrice, slope, customTokenMint = null) => {
  try {
    console.log('Initialize bonding curve function called');
    console.log('Initial price:', initialPrice);
    console.log('Slope:', slope);
    
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    const walletPubkey = wallet.publicKey;
    console.log('Using wallet:', walletPubkey.toString());
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Create an anchor provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: walletPubkey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
        signMessage: wallet.signMessage
      },
      AnchorProvider.defaultOptions()
    );
    
    // Create the program
    const program = new Program(idl, PROGRAM_ID, provider);
    console.log('Program created:', program.programId.toString());
    
    // Ensure tokenMint is a PublicKey
    let tokenMintToUse;
    if (customTokenMint) {
      tokenMintToUse = customTokenMint instanceof PublicKey ? 
        customTokenMint : new PublicKey(customTokenMint);
    } else {
      tokenMintToUse = TOKEN_MINT;
    }
    
    console.log('Using token mint:', tokenMintToUse.toString());
    
    // Create the bonding curve PDA
    const [bondingCurveAddress, bump] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, tokenMintToUse.toBuffer()],
      program.programId
    );
    
    console.log('Bonding curve PDA:', bondingCurveAddress.toString());
    
    // Check if the account already exists
    try {
      const accountInfo = await connection.getAccountInfo(bondingCurveAddress);
      
      if (accountInfo !== null) {
        console.log('Bonding curve already initialized:', bondingCurveAddress.toString());
        return { 
          success: true, 
          message: 'Bonding curve already exists', 
          address: bondingCurveAddress.toString(),
          explorerUrl: getExplorerUrl(bondingCurveAddress.toString())
        };
      }
    } catch (error) {
      console.error('Error checking account info:', error);
      // Continue with initialization if there was an error checking
    }
    
    // Ensure we're working with BN objects for Anchor compatibility
    let initialPriceBN, slopeBN;
    
    // Handle different input types for initialPrice
    if (initialPrice instanceof BN) {
      initialPriceBN = initialPrice;
    } else if (typeof initialPrice === 'number') {
      initialPriceBN = new BN(initialPrice);
    } else if (typeof initialPrice === 'string') {
      initialPriceBN = new BN(initialPrice);
    } else {
      // If it's an object with a toString method
      initialPriceBN = new BN(initialPrice.toString());
    }
    
    // Handle different input types for slope
    if (slope instanceof BN) {
      slopeBN = slope;
    } else if (typeof slope === 'number') {
      slopeBN = new BN(slope);
    } else if (typeof slope === 'string') {
      slopeBN = new BN(slope);
    } else {
      // If it's an object with a toString method
      slopeBN = new BN(slope.toString());
    }
    
    console.log('Preparing to call initialize...');
    console.log('Initial price BN:', initialPriceBN.toString());
    console.log('Slope BN:', slopeBN.toString());
    
    // Convert BN objects to u64 for Anchor compatibility
    // The program requires u64 type, which is what BN.toNumber() can represent if within range
    // Only use numeric values, not BN objects directly in the call
    try {
      // For Anchor Program methods, we need to ensure the types match the IDL
      // Use raw BN objects since @project-serum/anchor expects BN for u64 params
      // Try to use the BN objects directly without any manual conversion
      
      // Log detailed type information for debugging
      console.log('initialPrice type:', typeof initialPriceBN);
      console.log('slope type:', typeof slopeBN);
      console.log('initialPrice is BN:', initialPriceBN instanceof BN);
      console.log('slope is BN:', slopeBN instanceof BN);
      
      // Use program.rpc.initialize instead to have more control
      const tx = await program.rpc.initialize(
        initialPriceBN,  
        slopeBN,         
        {
          accounts: {
            bondingCurve: bondingCurveAddress,
            authority: walletPubkey,
            tokenMint: tokenMintToUse,
            systemProgram: SystemProgram.programId
          }
        }
      );
      
      console.log('Initialize transaction sent:', tx);
      
      // Save the token data to local storage
      const tokenData = {
        mint: tokenMintToUse.toString(),
        bondingCurve: bondingCurveAddress.toString(),
        initialPrice: initialPriceBN.toString(),
        slope: slopeBN.toString(),
        dateCreated: new Date().toISOString()
      };
      
      const saveResult = saveCreatedToken(walletPubkey.toString(), tokenData);
      console.log('Token data saved:', saveResult);
      
      return { 
        success: true, 
        signature: tx, 
        address: bondingCurveAddress.toString(),
        explorerUrl: getExplorerUrl(tokenMintToUse.toString()),
        bondingCurveUrl: getExplorerUrl(bondingCurveAddress.toString())
      };
    } catch (error) {
      console.error('Error initializing bonding curve:', error);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error('Error initializing bonding curve:', error);
    return { success: false, error: error.message };
  }
};

// Function to check if wallet is connected
export const checkWalletConnected = async () => {
    try {
        if (typeof window !== 'undefined') {
            const { solana } = window;

            if (!solana?.isPhantom) {
                throw new Error('Please install Phantom wallet from https://phantom.app/');
            }

            try {
                const response = await solana.connect({ onlyIfTrusted: true });
                return response.publicKey.toString();
            } catch (err) {
                return null;
            }
        }
        return null;
    } catch (error) {
        console.error('Error checking wallet connection:', error);
        throw error;
    }
};

// Function to connect wallet
export const connectWallet = async () => {
    try {
        if (typeof window !== 'undefined') {
            const { solana } = window;

            if (!solana?.isPhantom) {
                throw new Error('Please install Phantom wallet from https://phantom.app/');
            }

            const response = await solana.connect();
            return response.publicKey.toString();
        }
        return null;
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
};

// Function to disconnect wallet
export const disconnectWallet = async () => {
  try {
    if (typeof window !== 'undefined' && window.solana) {
      await window.solana.disconnect();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return false;
  }
};

// Check if bonding curve is initialized
export const checkBondingCurveInitialized = async () => {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Use the hardcoded PDA that matches what the program expects
    const expectedPDA = new PublicKey('4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd');
    console.log('Checking bonding curve PDA:', expectedPDA.toString());
    
    // Check if the account exists
    const accountInfo = await connection.getAccountInfo(expectedPDA);
    
    if (!accountInfo) {
      return {
        initialized: false,
        address: expectedPDA.toString(),
        explorerUrl: getExplorerUrl(expectedPDA.toString())
      };
    }
    
    // Account exists, return info
    return {
      initialized: true,
      address: expectedPDA.toString(),
      explorerUrl: getExplorerUrl(expectedPDA.toString())
    };
  } catch (error) {
    console.error('Error checking bonding curve:', error);
    return { initialized: false, error: error.message };
  }
};

// Add function to update bonding curve parameters
export const updateBondingCurveParameters = async (wallet, initialPrice, slope, tokenMint = TOKEN_MINT) => {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    
    const program = new Program(idl, PROGRAM_ID, provider);
    
    // Get PDA for bonding curve
    const [bondingCurvePDA] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, tokenMint.toBuffer()],
      program.programId
    );
    
    // Call the update_parameters instruction
    const tx = await program.methods
      .updateParameters(initialPrice, slope)
      .accounts({
        bondingCurve: bondingCurvePDA,
        authority: wallet.publicKey,
        tokenMint: tokenMint
      })
      .rpc();
    
    return {
      success: true,
      signature: tx,
      bondingCurve: bondingCurvePDA.toString()
    };
  } catch (error) {
    console.error('Error updating bonding curve parameters:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 