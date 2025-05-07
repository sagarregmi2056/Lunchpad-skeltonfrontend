import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Your deployed program ID
export const PROGRAM_ID = new PublicKey('ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4');

// Initialize connection to your preferred network (same as in raydiumUtils)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Initialize program interface
export const initializeProgram = async (wallet) => {
  try {
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    return {
      programId: PROGRAM_ID,
      connection,
      wallet
    };
  } catch (error) {
    console.error('Error initializing program:', error);
    throw error;
  }
};

// Function to create a transaction with your program
export const createProgramTransaction = async (wallet, instruction) => {
  try {
    const transaction = new Transaction();
    transaction.add(instruction);
    
    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    return transaction;
  } catch (error) {
    console.error('Error creating program transaction:', error);
    throw error;
  }
};

// Function to send and confirm transaction
export const sendAndConfirmTransaction = async (transaction, wallet) => {
  try {
    // Sign the transaction
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // Send the transaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
    // Confirm the transaction
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    return signature;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

// Get program account info
export const getProgramAccount = async () => {
  try {
    const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
    return accountInfo;
  } catch (error) {
    console.error('Error fetching program account:', error);
    throw error;
  }
};

// Example function to interact with your program (modify based on your program's instructions)
export const executeProgramInstruction = async (wallet, ...instructionParams) => {
  try {
    // Initialize program
    const program = await initializeProgram(wallet);
    
    // Create your program's instruction here
    // const instruction = await yourProgramInstruction(...instructionParams);
    
    // Create and send transaction
    const transaction = await createProgramTransaction(wallet, instruction);
    const signature = await sendAndConfirmTransaction(transaction, wallet);
    
    return signature;
  } catch (error) {
    console.error('Error executing program instruction:', error);
    throw error;
  }
}; 