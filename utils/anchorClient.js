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

// Add IDL validation function to fix common issues
const validateAndFixIdl = (idlData) => {
  // Create a working copy of the IDL
  const fixedIdl = JSON.parse(JSON.stringify(idlData));

  // Recursive function to fix all vector types in the IDL structure
  const fixVectorTypes = (obj) => {
    if (!obj) return;

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach(item => fixVectorTypes(item));
      return;
    }

    // Handle objects
    if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        // Check for vec<type> format in string values
        if (typeof obj[key] === 'string' && obj[key].startsWith('vec<')) {
          const innerType = obj[key].substring(4, obj[key].length - 1);
          
          // Set in both array format and vec format to maximize compatibility
          obj[key] = { vec: innerType };
          console.log(`Fixed vector type: ${key} from vec<${innerType}> to vec format`);
        } else if (typeof obj[key] === 'string' && obj[key] === 'pubkey') {
          // Fix pubkey to publicKey (capital K)
          obj[key] = 'publicKey';
          console.log(`Fixed type: ${key} from pubkey to publicKey`);
        } else {
          fixVectorTypes(obj[key]);
        }
      });
    }
  };

  // Apply vector fixes throughout the entire IDL
  fixVectorTypes(fixedIdl);
  
  // Check and fix account types if needed
  if (fixedIdl.accounts && Array.isArray(fixedIdl.accounts)) {
    for (let i = 0; i < fixedIdl.accounts.length; i++) {
      const account = fixedIdl.accounts[i];
      // If account doesn't have a type field, add one
      if (!account.type) {
        console.log(`Adding missing type field to account ${account.name}`);
        // Add a default struct type with the account's fields
        fixedIdl.accounts[i].type = {
          kind: "struct",
          fields: account.fields || [] // Use existing fields if available
        };
      }
      
      // Fix pubkey types and add camelCase aliases for fields if they use snake_case
      if (account.type && account.type.fields) {
        const newFields = [];
        
        // Check each field for snake_case and fix pubkey types
        account.type.fields.forEach(field => {
          // Fix pubkey types
          if (field.type === 'pubkey') {
            field.type = 'publicKey';
            console.log(`Fixed pubkey type to publicKey for field ${field.name}`);
          }
          
          if (field.name && field.name.includes('_')) {
            // Create camelCase version
            const parts = field.name.split('_');
            const camelCaseName = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
            
            // Create a new field with camelCase name but same type
            newFields.push({...field, name: camelCaseName});
          }
        });
        
        // Add the new camelCase fields
        account.type.fields.push(...newFields);
      }
    }
  }
  
  // Check types array exists
  if (!fixedIdl.types) {
    console.log('Adding missing types array to IDL');
    fixedIdl.types = [];
  }
  
  // Make sure BondingCurve type exists in types for account reference
  const hasBondingCurveType = fixedIdl.types.some(t => t.name === 'BondingCurve');
  if (!hasBondingCurveType) {
    console.log('Adding missing BondingCurve type to IDL');
    fixedIdl.types.push({
      name: "BondingCurve",
      type: {
        kind: "struct",
        fields: [
          { name: "authority", type: "publicKey" }, // Change pubkey to publicKey
          { name: "initialPrice", type: "u64" },
          { name: "slope", type: "u64" },
          { name: "totalSupply", type: "u64" },
          { name: "tokenMint", type: "publicKey" }, // Change pubkey to publicKey
          { name: "bump", type: "u8" },
          // Include snake_case versions as well for compatibility
          { name: "initial_price", type: "u64" },
          { name: "total_supply", type: "u64" },
          { name: "token_mint", type: "publicKey" } // Change pubkey to publicKey
        ]
      }
    });
  } else {
    // Ensure existing BondingCurve type has correct field types
    const bondingCurveType = fixedIdl.types.find(t => t.name === 'BondingCurve');
    if (bondingCurveType && bondingCurveType.type && bondingCurveType.type.fields) {
      bondingCurveType.type.fields.forEach(field => {
        if (field.type === 'pubkey') {
          field.type = 'publicKey';
          console.log(`Fixed pubkey type to publicKey for field ${field.name} in BondingCurve type`);
        }
      });
    }
  }
  
  // Fix instruction parameter types
  if (fixedIdl.instructions && Array.isArray(fixedIdl.instructions)) {
    fixedIdl.instructions.forEach(instruction => {
      if (instruction.args && Array.isArray(instruction.args)) {
        instruction.args.forEach(arg => {
          // Convert "vec" types to explicit array types
          if (typeof arg.type === 'string' && arg.type.startsWith('vec<')) {
            const innerType = arg.type.substring(4, arg.type.length - 1);
            arg.type = { 
              vec: innerType 
            };
          }
          
          // Fix pubkey types
          if (arg.type === 'pubkey') {
            arg.type = 'publicKey';
            console.log(`Fixed pubkey type to publicKey for arg ${arg.name}`);
          }
          
          // Ensure all BN/u64/i64 types are properly formatted
          if (arg.name === 'initialPrice' || arg.name === 'initial_price' || 
              arg.name === 'slope') {
            arg.type = 'u64';
          }
        });
      }
    });
  }
  
  // Ensure accounts in each instruction have correct type fields
  if (fixedIdl.instructions && Array.isArray(fixedIdl.instructions)) {
    fixedIdl.instructions.forEach(instruction => {
      if (instruction.accounts && Array.isArray(instruction.accounts)) {
        instruction.accounts.forEach(account => {
          // Ensure each account has an isMut and isSigner property
          if (typeof account.isMut !== 'boolean') {
            account.isMut = false;
          }
          if (typeof account.isSigner !== 'boolean') {
            account.isSigner = false;
          }
        });
      }
    });
  }
  
  console.log('IDL successfully validated and fixed');
  return fixedIdl;
};

// Apply IDL fixes to the imported IDL
const fixedIdl = validateAndFixIdl(idl);
console.log('Using fixed IDL structure');

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
          
          // Ensure IDL is properly fixed before creating program
          // Apply additional fixes specifically for pubkey vs publicKey issues
          const enhancedIdl = (() => {
            const idlCopy = JSON.parse(JSON.stringify(fixedIdl));
            
            // Function to recursively fix pubkey -> publicKey
            const fixPubkeyTypes = (obj) => {
              if (!obj) return;
              
              // Handle arrays
              if (Array.isArray(obj)) {
                obj.forEach(item => fixPubkeyTypes(item));
                return;
              }
              
              // Handle objects
              if (typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                  if (typeof obj[key] === 'string' && obj[key] === 'pubkey') {
                    obj[key] = 'publicKey';
                  } else {
                    fixPubkeyTypes(obj[key]);
                  }
                });
              }
            };
            
            // Apply fixes
            fixPubkeyTypes(idlCopy);
            
            // Specifically check account fields
            if (idlCopy.accounts && Array.isArray(idlCopy.accounts)) {
              idlCopy.accounts.forEach(account => {
                if (account.type && account.type.fields) {
                  account.type.fields.forEach(field => {
                    if (field.type === 'pubkey') {
                      field.type = 'publicKey';
                    }
                  });
                }
              });
            }
            
            // Check types
            if (idlCopy.types && Array.isArray(idlCopy.types)) {
              idlCopy.types.forEach(type => {
                if (type.type && type.type.fields) {
                  type.type.fields.forEach(field => {
                    if (field.type === 'pubkey') {
                      field.type = 'publicKey';
                    }
                  });
                }
              });
            }
            
            return idlCopy;
          })();
          
          // Check idl structure before creating program
          console.log('IDL structure check:', {
            address: enhancedIdl.address,
            metadata: enhancedIdl.metadata,
            hasInstructions: !!enhancedIdl.instructions,
            instructionsCount: enhancedIdl.instructions?.length
          });
          
          // Create program with a try/catch to identify specific errors
          let anchorProgram;
          try {
            anchorProgram = new Program(enhancedIdl, PROGRAM_ID, provider);
            console.log('Program created successfully');
          } catch (progError) {
            console.error('Error creating program:', progError);
            // Continue without throwing to avoid breaking the app completely
            return;
          }
          
          console.log('Program from anchorClient:', anchorProgram);

          // Get the bonding curve PDA
          const [bondingCurveAddress] = await PublicKey.findProgramAddress(
            [BONDING_CURVE_SEED, TOKEN_MINT.toBuffer()],
            PROGRAM_ID
          );
          
          // Get or create associated token account
          const tokenAccount = await getOrCreateAssociatedTokenAccount(
            wallet.publicKey,
            TOKEN_MINT
          );
          console.log('Token account from anchorClient:', tokenAccount);

          setProvider(provider);
          setProgram(anchorProgram);
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
    
    // Deep cloning the IDL and making sure it's properly structured before using
    const deepClonedIdl = JSON.parse(JSON.stringify(fixedIdl));
    
    // Add additional IDL validation specifically for bonding curve initialization
    const enhancedIdl = (() => {
      const idl = deepClonedIdl;
      
      // Find the initialize instruction
      const initInstruction = idl.instructions.find(i => i.name === 'initialize');
      if (initInstruction && initInstruction.args) {
        // Ensure args have the correct types
        initInstruction.args.forEach(arg => {
          if (arg.name === 'initialPrice' || arg.name === 'initial_price' || arg.name === 'slope') {
            arg.type = 'u64'; // Ensure these are u64 type
          }
        });
      }
      
      // Fix any vector type issues throughout the IDL
      const fixVectorTypes = (obj) => {
        if (!obj) return;
        
        // Handle arrays
        if (Array.isArray(obj)) {
          obj.forEach(item => fixVectorTypes(item));
          return;
        }
        
        // Handle objects
        if (typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            // Check for vec<type> format in string values
            if (typeof obj[key] === 'string' && obj[key].startsWith('vec<')) {
              const innerType = obj[key].substring(4, obj[key].length - 1);
              obj[key] = {
                vec: innerType
              };
              console.log(`Fixed vector type: ${key} from vec<${innerType}> to { vec: ${innerType} }`);
            } else if (typeof obj[key] === 'string' && obj[key] === 'pubkey') {
              // Fix pubkey to publicKey (capital K)
              obj[key] = 'publicKey';
              console.log(`Fixed type: ${key} from pubkey to publicKey`);
            } else {
              fixVectorTypes(obj[key]);
            }
          });
        }
      };
      
      // Apply vector type fixes
      fixVectorTypes(idl);
      
      // Explicitly define the BondingCurve account structure - use camelCase here
      const bondingCurveAccount = idl.accounts.find(a => a.name === 'BondingCurve');
      if (bondingCurveAccount) {
        bondingCurveAccount.type = {
          kind: 'struct',
          fields: [
            {name: 'authority', type: 'publicKey'},
            {name: 'initialPrice', type: 'u64'},
            {name: 'slope', type: 'u64'},
            {name: 'totalSupply', type: 'u64'},
            {name: 'tokenMint', type: 'publicKey'},
            {name: 'bump', type: 'u8'}
          ]
        };
      }
      
      // Add camelCase aliases alongside snake_case names for maximum compatibility
      // This addresses inconsistencies in how field names are referenced
      if (idl.accounts) {
        idl.accounts.forEach(account => {
          if (account.type && account.type.fields) {
            const newFields = [];
            
            account.type.fields.forEach(field => {
              // Fix pubkey types
              if (field.type === 'pubkey') {
                field.type = 'publicKey';
              }
              
              if (field.name.includes('_')) {
                // Add camelCase version of the field
                const parts = field.name.split('_');
                const camelCaseName = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                newFields.push({...field, name: camelCaseName});
              }
            });
            
            // Append new fields to existing ones
            account.type.fields.push(...newFields);
          }
        });
      }
      
      // Fix types array if it exists
      if (idl.types && Array.isArray(idl.types)) {
        idl.types.forEach(type => {
          if (type.type && type.type.fields && Array.isArray(type.type.fields)) {
            type.type.fields.forEach(field => {
              if (field.type === 'pubkey') {
                field.type = 'publicKey';
              }
            });
          }
        });
      }
      
      return idl;
    })();
    
    // Create the program with our enhanced IDL
    const program = new Program(enhancedIdl, PROGRAM_ID, provider);
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
    
    try {
      // Use methods.initialize to avoid type issues
      // Log detailed information about the program instance
      console.log('Program IDL instructions:', program.idl.instructions.map(i => i.name));
      
      // Make sure the initialize method exists
      if (!program.methods.initialize) {
        console.error('Initialize method not found on program');
        return { success: false, error: 'Program method "initialize" not found' };
      }
      
      // Log parameters being passed
      console.log('Passing parameters to initialize:', {
        initialPriceBNtype: typeof initialPriceBN,
        initialPriceBNisNumber: typeof initialPriceBN.toNumber === 'function',
        slopeBNtype: typeof slopeBN,
        slopeBNisNumber: typeof slopeBN.toNumber === 'function',
      });
      
      // Try using a direct approach with proper types
      const tx = await program.methods
        .initialize(
          initialPriceBN,  // This should be a BN instance
          slopeBN          // This should be a BN instance
        )
        .accounts({
          bondingCurve: bondingCurveAddress,
          authority: walletPubkey,
          tokenMint: tokenMintToUse,
          systemProgram: SystemProgram.programId
        })
        .signers([])  // Add empty signers array explicitly
        .rpc({
          commitment: 'confirmed',
          skipPreflight: false, // Enable preflight to catch errors before submitting
        });
      
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
    
    // Derive PDA following the same pattern as in other functions 
    const [expectedPDA] = await PublicKey.findProgramAddress(
      [BONDING_CURVE_SEED, TOKEN_MINT.toBuffer()],
      PROGRAM_ID
    );
    
    console.log('Checking bonding curve PDA:', expectedPDA.toString());
    
    // Cache to avoid constant requests in development
    const CACHE_KEY = 'bondingCurveStatus';
    
    // Check if we should skip the network check
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(CACHE_KEY);
      
      if (cachedData) {
        const { status, timestamp, address } = JSON.parse(cachedData);
        
        // Cache is valid for 30 seconds
        if (Date.now() - timestamp < 30000 && address === expectedPDA.toString()) {
          console.log('Using cached bonding curve status');
          return {
            initialized: status,
            address: expectedPDA.toString(),
            explorerUrl: getExplorerUrl(expectedPDA.toString())
          };
        }
      }
    }
    
    // Check if the account exists with better error handling
    let accountInfo = null;
    let error = null;
    
    try {
      // First, check if RPC is responsive
      await connection.getLatestBlockhash();
      
      // Then check account info
      accountInfo = await connection.getAccountInfo(expectedPDA);
    } catch (e) {
      console.error('Error checking account info:', e);
      error = e.message;
      
      // If it's a blockhash error, try with a new connection
      if (e.message.includes('Blockhash not found')) {
        try {
          // Create a new connection with different commitment level
          const newConnection = new Connection('https://api.devnet.solana.com', 'processed');
          accountInfo = await newConnection.getAccountInfo(expectedPDA);
          error = null; // Reset error if successful
        } catch (retryError) {
          console.error('Retry error:', retryError);
          error = `Failed after retry: ${retryError.message}`;
        }
      }
    }
    
    const status = accountInfo !== null;
    
    // Store in cache
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        status,
        timestamp: Date.now(),
        address: expectedPDA.toString()
      }));
    }
    
    // Account exists, return info
    return {
      initialized: status,
      address: expectedPDA.toString(),
      explorerUrl: getExplorerUrl(expectedPDA.toString()),
      error: error // Include any error message for debugging
    };
  } catch (error) {
    console.error('Error checking bonding curve:', error);
    // Return a detailed error object but still maintain functionality
    return { 
      initialized: false, 
      error: error.message,
      diagnosticInfo: {
        errorType: error.name,
        fullMessage: error.message,
        stack: error.stack?.slice(0, 100) // Include part of stack trace
      },
      address: "4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd",
      explorerUrl: getExplorerUrl("4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd") 
    };
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
    
    const program = new Program(fixedIdl, PROGRAM_ID, provider);
    
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