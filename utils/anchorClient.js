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
            [BONDING_CURVE_SEED],
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

// Initialize the bonding curve (admin only)
export const initializeBondingCurve = async (wallet, initialPrice, slope, customTokenMint = null) => {
  try {
    if (!wallet || !wallet.publicKey) throw new Error('Wallet not connected');

    // Create a proper provider
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );
    
    const program = new Program(idl, PROGRAM_ID, provider);
    console.log('Program:', program);
    
    // Use the custom token mint if provided, otherwise use the default
    const tokenMintToUse = customTokenMint || TOKEN_MINT;
    console.log('Using token mint:', tokenMintToUse.toString());
    
    // IMPORTANT: The PDA derived in the client does not match what the program expects
    // The program is looking for: 4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd
    // While our client derivation produces: DxoVvbJv4mm1bQ73Wf1UZ1UK7yE9coG9BRv6ZYx7DEdc
    
    // We need to use the exact PDA that the program expects
    const expectedPDA = new PublicKey('4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd');
    console.log('Using expected PDA from program:', expectedPDA.toString());

    // Check if the account already exists
    try {
      const accountInfo = await connection.getAccountInfo(expectedPDA);
      
      if (accountInfo !== null) {
        console.log('Bonding curve already initialized:', expectedPDA.toString());
        return { 
          success: true, 
          message: 'Bonding curve already exists', 
          address: expectedPDA.toString(),
          explorerUrl: getExplorerUrl(expectedPDA.toString())
        };
      }
    } catch (err) {
      console.log('Error checking account, will try to create:', err);
    }

    // Convert wallet.publicKey to PublicKey if it's not already
    const walletPubkey = wallet.publicKey instanceof PublicKey 
      ? wallet.publicKey 
      : new PublicKey(wallet.publicKey);

    // Convert initialPrice and slope to BN objects
    // Make sure these are proper BigNumber objects
    const initialPriceBN = new BN(initialPrice.toString());
    const slopeBN = new BN(slope.toString());

    console.log('InitialPrice:', initialPrice, 'as BN:', initialPriceBN.toString());
    console.log('Slope:', slope, 'as BN:', slopeBN.toString());

    const tx = await program.methods
      .initialize(initialPriceBN, slopeBN)
      .accounts({
        bondingCurve: expectedPDA,
        authority: walletPubkey,
        tokenMint: tokenMintToUse,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    // Save token creation info to localStorage
    const walletAddress = walletPubkey.toString();
    const tokenData = {
      mint: tokenMintToUse.toString(),
      bondingCurve: expectedPDA.toString(),
      initialPrice: initialPrice.toString(),
      slope: slope.toString(),
      txSignature: tx
    };

    saveCreatedToken(walletAddress, tokenData);

    return { 
      success: true, 
      signature: tx, 
      address: expectedPDA.toString(),
      explorerUrl: getExplorerUrl(tokenMintToUse.toString()),
      bondingCurveUrl: getExplorerUrl(expectedPDA.toString())
    };
  } catch (error) {
    console.error('Error initializing bonding curve:', error);
    throw error;
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