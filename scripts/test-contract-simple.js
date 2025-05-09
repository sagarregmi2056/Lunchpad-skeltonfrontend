import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import pkg from '@project-serum/anchor';
const { AnchorProvider, Program, BN, web3 } = pkg;
import fs from 'fs';
import path from 'path';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getMint, setAuthority, AuthorityType } from '@solana/spl-token';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded IDL to avoid loading issues
const idl = {
  version: "0.1.0",
  name: "bonding_curve_new",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "bonding_curve", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "token_mint", isMut: false, isSigner: false },
        { name: "system_program", isMut: false, isSigner: false }
      ],
      args: [
        { name: "initialPrice", type: "u64" },
        { name: "slope", type: "u64" }
      ]
    },
    {
      name: "buyTokens",
      accounts: [
        { name: "bonding_curve", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "buyer", isMut: true, isSigner: true },
        { name: "buyer_token_account", isMut: true, isSigner: false },
        { name: "token_mint", isMut: true, isSigner: false },
        { name: "token_program", isMut: false, isSigner: false },
        { name: "system_program", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    },
    {
      name: "sellTokens",
      accounts: [
        { name: "bonding_curve", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "seller", isMut: true, isSigner: true },
        { name: "seller_token_account", isMut: true, isSigner: false },
        { name: "token_mint", isMut: true, isSigner: false },
        { name: "token_program", isMut: false, isSigner: false },
        { name: "system_program", isMut: false, isSigner: false }
      ],
      args: [
        { name: "amount", type: "u64" }
      ]
    },
    {
      name: "updateParameters",
      accounts: [
        { name: "bondingCurve", isMut: true, isSigner: false },
        { name: "authority", isMut: true, isSigner: true },
        { name: "tokenMint", isMut: false, isSigner: false }
      ],
      args: [
        { name: "initialPrice", type: "u64" },
        { name: "slope", type: "u64" }
      ]
    }
  ],
  accounts: [
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
  errors: [
    { code: 6000, name: "InvalidParameters", msg: "Invalid parameters provided" },
    { code: 6001, name: "Overflow", msg: "Overflow occurred during calculation" },
    { code: 6002, name: "Unauthorized", msg: "Unauthorized access" },
    { code: 6003, name: "InvalidTokenAccount", msg: "Invalid token account" },
    { code: 6004, name: "InvalidAmount", msg: "Amount must be greater than 0" }
  ]
};

// Your wallet keypair - replace with your own if needed
const walletKeypairPath = path.resolve('/home/saga/.config/solana/id.json');
const walletKeypair = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(walletKeypairPath, 'utf8')))
);

// Contract and token parameters
const PROGRAM_ID = new PublicKey('ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4');
const TOKEN_MINT = new PublicKey('EPD1phHBAgZNzJ85cGn3g2fV1YG22A9oWnYA2p99kvLk'); // Update with your token mint
const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

// Setup connection and provider
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const provider = new AnchorProvider(
  connection,
  {
    publicKey: walletKeypair.publicKey,
    signTransaction: (tx) => {
      tx.sign(walletKeypair);
      return Promise.resolve(tx);
    },
    signAllTransactions: (txs) => {
      return Promise.all(txs.map(tx => {
        tx.sign(walletKeypair);
        return tx;
      }));
    },
  },
  AnchorProvider.defaultOptions()
);

// Initialize the program
const program = new Program(idl, PROGRAM_ID, provider);

// Helper function to get or create associated token account
async function getOrCreateAssociatedTokenAccount(mint) {
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    walletKeypair.publicKey
  );

  try {
    await connection.getTokenAccountBalance(associatedTokenAddress);
    console.log('Token account exists:', associatedTokenAddress.toString());
    return associatedTokenAddress;
  } catch (error) {
    console.log('Creating token account...');
    
    const transaction = new web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey,
        associatedTokenAddress,
        walletKeypair.publicKey,
        mint
      )
    );
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;
    
    const signature = await provider.connection.sendTransaction(
      transaction,
      [walletKeypair]
    );
    
    await connection.confirmTransaction(signature);
    console.log('Token account created:', associatedTokenAddress.toString());
    return associatedTokenAddress;
  }
}

// Get the bonding curve PDA
async function getBondingCurvePDA() {
  const [bondingCurveAddress] = await PublicKey.findProgramAddress(
    [BONDING_CURVE_SEED, TOKEN_MINT.toBuffer()],
    program.programId
  );
  return bondingCurveAddress;
}

// Buy tokens
async function buyTokens(amount) {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(TOKEN_MINT);
    
    // Get wallet SOL balance first
    const walletBalance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`Current wallet balance: ${walletBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Get bonding curve data to calculate cost
    const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);
    const initialPrice = bondingCurveAccount.initialPrice;
    const slope = bondingCurveAccount.slope;
    const totalSupply = bondingCurveAccount.totalSupply;
    
    // Calculate cost (simplistic calculation)
    const currentPrice = initialPrice.add(totalSupply.mul(slope));
    const estimatedCost = currentPrice.mul(new BN(amount * 1e9));
    console.log(`Estimated cost: ${estimatedCost.toString() / LAMPORTS_PER_SOL} SOL`);
    
    // Check if wallet has enough SOL
    if (estimatedCost.gt(new BN(walletBalance))) {
      throw new Error(`Not enough SOL in wallet. Need ~${estimatedCost.toString() / LAMPORTS_PER_SOL} SOL, have ${walletBalance / LAMPORTS_PER_SOL} SOL`);
    }
    
    // Convert amount to u64 (1 token = 10^9 (9 decimals))
    const amountBN = new BN(amount * 1e9);
    
    console.log(`Buying ${amount} tokens...`);
    
    const tx = await program.methods
      .buyTokens(amountBN)
      .accounts({
        bonding_curve: bondingCurvePDA,
        authority: walletKeypair.publicKey,
        buyer: walletKeypair.publicKey,
        buyer_token_account: userTokenAccount,
        token_mint: TOKEN_MINT,
        token_program: TOKEN_PROGRAM_ID,
        system_program: web3.SystemProgram.programId
      })
      .signers([walletKeypair])
      .rpc();
    
    console.log('Buy transaction:', tx);
    
    // Get new token balance
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('New token balance:', tokenBalance.value.uiAmount);
    
    return tx;
  } catch (error) {
    console.error('Error buying tokens:', error);
    throw error;
  }
}

// Sell tokens
async function sellTokens(amount) {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(TOKEN_MINT);
    
    // Convert amount to u64 (1 token = 10^9 (9 decimals))
    const amountBN = new BN(amount * 1e9);
    
    console.log(`Selling ${amount} tokens...`);
    
    const tx = await program.methods
      .sellTokens(amountBN)
      .accounts({
        bonding_curve: bondingCurvePDA,
        authority: walletKeypair.publicKey,
        seller: walletKeypair.publicKey,
        seller_token_account: userTokenAccount,
        token_mint: TOKEN_MINT,
        token_program: TOKEN_PROGRAM_ID,
        system_program: web3.SystemProgram.programId
      })
      .signers([walletKeypair])
      .rpc();
    
    console.log('Sell transaction:', tx);
    
    // Get new token balance
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('New token balance:', tokenBalance.value.uiAmount);
    
    return tx;
  } catch (error) {
    console.error('Error selling tokens:', error);
    throw error;
  }
}

// Add a function to analyze the bonding curve
async function analyzeBondingCurve() {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);
    
    const initialPrice = bondingCurveAccount.initialPrice;
    const slope = bondingCurveAccount.slope;
    const totalSupply = bondingCurveAccount.totalSupply;
    
    console.log('======= BONDING CURVE ANALYSIS =======');
    console.log(`Initial price: ${initialPrice.toString() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Slope: ${slope.toString() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Total supply: ${totalSupply.toString() / 1e9} tokens`);
    
    // Calculate current price
    const currentPrice = initialPrice.add(totalSupply.mul(slope));
    console.log(`Current price per token: ${currentPrice.toString() / LAMPORTS_PER_SOL} SOL`);
    
    // Calculate prices for various amounts
    console.log('\nCost to buy:');
    [0.000001, 0.00001, 0.0001, 0.001, 0.01, 0.1, 1].forEach(amount => {
      const cost = currentPrice.mul(new BN(amount * 1e9)).toString() / LAMPORTS_PER_SOL;
      console.log(`${amount} tokens: ${cost} SOL`);
    });
    
    return bondingCurveAccount;
  } catch (error) {
    console.error('Error analyzing bonding curve:', error);
    return null;
  }
}

// Add a function to update the bonding curve parameters
async function updateBondingCurveParameters() {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    
    // Get current parameters for logging
    const currentData = await program.account.bondingCurve.fetch(bondingCurvePDA);
    console.log('Current parameters:');
    console.log(`Initial price: ${currentData.initialPrice.toString() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Slope: ${currentData.slope.toString() / LAMPORTS_PER_SOL} SOL`);
    
    // Much lower values
    const initialPrice = new BN(0.000001 * LAMPORTS_PER_SOL); // 0.000001 SOL (1 lamport)
    const slope = new BN(0.0000001 * LAMPORTS_PER_SOL); // 0.0000001 SOL (0.1 lamport)
    
    console.log('Updating to new values:');
    console.log(`Initial price: ${initialPrice.toString() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Slope: ${slope.toString() / LAMPORTS_PER_SOL} SOL`);
    
    // Call the update_parameters function
    const tx = await program.methods
      .updateParameters(initialPrice, slope)
      .accounts({
        bondingCurve: bondingCurvePDA,
        authority: walletKeypair.publicKey,
        tokenMint: TOKEN_MINT
      })
      .signers([walletKeypair])
      .rpc();
    
    console.log('Update transaction:', tx);
    
    // Verify the update
    const updatedData = await program.account.bondingCurve.fetch(bondingCurvePDA);
    console.log('Updated parameters:');
    console.log(`Initial price: ${updatedData.initialPrice.toString() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Slope: ${updatedData.slope.toString() / LAMPORTS_PER_SOL} SOL`);
    
    return tx;
  } catch (error) {
    console.error('Error updating bonding curve parameters:', error);
    throw error;
  }
}

// Add a function to check and fix the mint authority
async function checkAndFixMintAuthority() {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    
    console.log('Checking token mint authority...');
    const mintInfo = await getMint(connection, TOKEN_MINT);
    
    console.log('Current mint authority:', mintInfo.mintAuthority.toString());
    console.log('Bonding curve PDA:', bondingCurvePDA.toString());
    
    if (mintInfo.mintAuthority.toString() !== bondingCurvePDA.toString()) {
      console.log('Mint authority does not match bonding curve PDA. Attempting to update...');
      
      const transaction = await setAuthority(
        connection,
        walletKeypair,
        TOKEN_MINT,
        walletKeypair.publicKey,
        AuthorityType.MintTokens,
        bondingCurvePDA
      );
      
      console.log('Mint authority updated. Transaction:', transaction);
      
      // Verify the update
      const updatedMintInfo = await getMint(connection, TOKEN_MINT);
      console.log('New mint authority:', updatedMintInfo.mintAuthority.toString());
      
      return true;
    } else {
      console.log('Mint authority correctly set to bonding curve PDA.');
      return true;
    }
  } catch (error) {
    console.error('Error checking/updating mint authority:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('Wallet address:', walletKeypair.publicKey.toString());
    
    // Get the bonding curve PDA
    const bondingCurvePDA = await getBondingCurvePDA();
    console.log('Bonding curve PDA:', bondingCurvePDA.toString());
    
    // Initialize the bonding curve if it doesn't exist
    try {
      const existingData = await program.account.bondingCurve.fetch(bondingCurvePDA);
      console.log('Bonding curve already exists with data:', existingData);
      
      // Analyze the bonding curve pricing
      await analyzeBondingCurve();
      
      // Update the parameters to much lower values
      // This will only work if you've deployed the updated contract with the update_parameters function
      try {
        await updateBondingCurveParameters();
        console.log("Parameters updated successfully!");
      } catch (updateError) {
        console.error('Error updating parameters - you may need to deploy the updated contract:', updateError.message);
      }
      
    } catch (error) {
      console.log('Bonding curve not initialized yet, initializing...');
      
      // Use very small values from the start if initializing a new curve
      const initialPrice = new BN(0.000001 * LAMPORTS_PER_SOL); // 0.000001 SOL (1 lamport)
      const slope = new BN(0.0000001 * LAMPORTS_PER_SOL); // 0.0000001 SOL (0.1 lamport)
      
      try {
        const tx = await program.methods
          .initialize(initialPrice, slope)
          .accounts({
            bonding_curve: bondingCurvePDA,
            authority: walletKeypair.publicKey,
            token_mint: TOKEN_MINT,
            system_program: web3.SystemProgram.programId
          })
          .signers([walletKeypair])
          .rpc();
        
        console.log('Initialization transaction:', tx);
      } catch (initError) {
        console.error('Error initializing bonding curve:', initError);
      }
    }
    
    // Get user token account
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(TOKEN_MINT);
    console.log('User token account:', userTokenAccount.toString());
    
    // Check and fix the mint authority before attempting to buy
    const mintAuthorityFixed = await checkAndFixMintAuthority();
    
    // Get current token balance
    try {
      const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
      console.log('Current token balance:', tokenBalance.value.uiAmount);
      
      // Only attempt to buy if the mint authority is fixed
      if (mintAuthorityFixed) {
        // After parameters update, we can try buying tokens with a small amount
        await buyTokens(0.0001); // Buy 0.0001 tokens instead of 0.1
      } else {
        console.log("Skipping buy operation due to mint authority issues.");
      }
      
      // Uncomment to sell tokens if you have any
      // await sellTokens(0.05); // Sell 0.05 tokens
    } catch (error) {
      console.error('Error checking token balance:', error);
    }
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function
main().then(() => {
  console.log('Script finished');
  process.exit(0);
}).catch(error => {
  console.error('Script error:', error);
  process.exit(1);
}); 