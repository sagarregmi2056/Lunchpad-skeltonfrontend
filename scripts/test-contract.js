import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import pkg from '@project-serum/anchor';
const { AnchorProvider, Program, BN, web3 } = pkg;
import fs from 'fs';
import path from 'path';
import { TOKEN_PROGRAM_ID, getMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the IDL
const idlPath = path.resolve(__dirname, '../utils/idl.json');
const idlFile = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

// Convert the IDL to the format anchor expects
const idl = {
  version: idlFile.metadata.version || "0.1.0",
  name: idlFile.metadata.name || "bonding_curve_new",
  instructions: idlFile.instructions.map(ix => ({
    name: ix.name,
    accounts: ix.accounts.map(acc => ({
      name: acc.name,
      isMut: acc.writable === true,
      isSigner: acc.signer === true,
    })),
    args: ix.args.map(arg => ({
      name: arg.name,
      type: arg.type
    }))
  })),
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
  errors: idlFile.errors.map(err => ({
    code: err.code,
    name: err.name,
    msg: err.msg
  }))
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

// Read bonding curve data
async function getBondingCurveData() {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    console.log('Bonding curve PDA:', bondingCurvePDA.toString());
    
    const bondingCurveAccount = await program.account.bondingCurve.fetch(bondingCurvePDA);
    console.log('Bonding curve data:');
    console.log('  Authority:', bondingCurveAccount.authority.toString());
    console.log('  Initial price:', bondingCurveAccount.initialPrice.toString(), 'lamports');
    console.log('  Slope:', bondingCurveAccount.slope.toString(), 'lamports');
    console.log('  Total supply:', bondingCurveAccount.totalSupply.toString());
    console.log('  Token mint:', bondingCurveAccount.tokenMint.toString());
    console.log('  Bump:', bondingCurveAccount.bump);
    return bondingCurveAccount;
  } catch (error) {
    console.error('Error fetching bonding curve data:', error);
    return null;
  }
}

// Initialize the bonding curve
async function initializeBondingCurve() {
  try {
    const initialPrice = new BN(1 * LAMPORTS_PER_SOL); // 1 SOL
    const slope = new BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
    
    const bondingCurvePDA = await getBondingCurvePDA();
    console.log('Initializing bonding curve at:', bondingCurvePDA.toString());
    
    // Check if the account already exists
    try {
      const existingData = await program.account.bondingCurve.fetch(bondingCurvePDA);
      console.log('Bonding curve already exists with data:', existingData);
      return existingData;
    } catch (error) {
      // Not initialized yet, continue
    }
    
    const tx = await program.methods
      .initialize(initialPrice, slope)
      .accounts({
        bondingCurve: bondingCurvePDA,
        authority: walletKeypair.publicKey,
        tokenMint: TOKEN_MINT,
        systemProgram: web3.SystemProgram.programId
      })
      .signers([walletKeypair])
      .rpc();
    
    console.log('Initialization transaction:', tx);
    return await getBondingCurveData();
  } catch (error) {
    console.error('Error initializing bonding curve:', error);
    throw error;
  }
}

// Buy tokens
async function buyTokens(amount) {
  try {
    const bondingCurvePDA = await getBondingCurvePDA();
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(TOKEN_MINT);
    
    // Convert amount to u64 (1 token = 10^9 (9 decimals))
    const amountBN = new BN(amount * 1e9);
    
    console.log(`Buying ${amount} tokens...`);
    
    const tx = await program.methods
      .buyTokens(amountBN)
      .accounts({
        bondingCurve: bondingCurvePDA,
        authority: walletKeypair.publicKey,
        buyer: walletKeypair.publicKey,
        buyerTokenAccount: userTokenAccount,
        tokenMint: TOKEN_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId
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
        bondingCurve: bondingCurvePDA,
        authority: walletKeypair.publicKey,
        seller: walletKeypair.publicKey,
        sellerTokenAccount: userTokenAccount,
        tokenMint: TOKEN_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId
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

// Main function
async function main() {
  try {
    console.log('Wallet address:', walletKeypair.publicKey.toString());
    
    // 1. Check if we need to initialize the bonding curve
    await initializeBondingCurve();
    
    // 2. Get current bonding curve data
    const bondingCurveData = await getBondingCurveData();
    
    // 3. Get user token balance
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(TOKEN_MINT);
    const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount);
    console.log('Current token balance:', tokenBalance.value.uiAmount);
    
    // 4. Buy tokens - comment out if you don't want to buy
    // await buyTokens(10); // Buy 10 tokens
    
    // 5. Sell tokens - comment out if you don't want to sell
    // await sellTokens(5); // Sell 5 tokens
    
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