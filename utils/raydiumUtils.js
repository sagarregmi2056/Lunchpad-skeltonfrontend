import { Connection, PublicKey } from '@solana/web3.js';
import { Raydium, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';
import { PROGRAM_ID, createProgramTransaction, sendAndConfirmTransaction } from './programUtils';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export const initializeRaydium = async (owner, signAllTransactions = undefined) => {
  try {
    // Get token accounts including Token2022
    const solAccountResp = await connection.getAccountInfo(owner.publicKey);
    const tokenAccountResp = await connection.getTokenAccountsByOwner(owner.publicKey, { 
      programId: TOKEN_PROGRAM_ID 
    });
    const token2022Resp = await connection.getTokenAccountsByOwner(owner.publicKey, { 
      programId: TOKEN_2022_PROGRAM_ID 
    });

    // Parse token account data
    const tokenAccountData = parseTokenAccountResp({
      owner: owner.publicKey,
      solAccountResp,
      tokenAccountResp: {
        context: tokenAccountResp.context,
        value: [...tokenAccountResp.value, ...token2022Resp.value],
      },
    });

    // Initialize Raydium SDK
    const raydium = await Raydium.load({
      connection,
      owner,
      signAllTransactions,
      tokenAccounts: tokenAccountData.tokenAccounts,
      tokenAccountRawInfos: tokenAccountData.tokenAccountRawInfos,
      disableLoadToken: false,
    });

    return raydium;
  } catch (error) {
    console.error('Error initializing Raydium:', error);
    throw error;
  }
};

export const getPoolInfo = async (raydium, poolIds) => {
  try {
    // Join multiple pool IDs with comma if needed
    const ids = Array.isArray(poolIds) ? poolIds.join(',') : poolIds;
    const poolInfo = await raydium.api.fetchPoolById({ ids });
    return poolInfo;
  } catch (error) {
    console.error('Error fetching pool info:', error);
    throw error;
  }
};

// Fetch token information
export const getTokenInfo = async (raydium, mintAddresses) => {
  try {
    const tokenInfo = await raydium.api.getTokenInfo(mintAddresses);
    return tokenInfo;
  } catch (error) {
    console.error('Error fetching token info:', error);
    throw error;
  }
};

export const getPoolsByMints = async (raydium, mint1, mint2) => {
  try {
    const pools = await raydium.api.fetchPoolByMints({
      mint1,
      mint2, // Optional
    });
    return pools;
  } catch (error) {
    console.error('Error fetching pools by mints:', error);
    throw error;
  }
};

// Fetch farm information
export const getFarmInfo = async (raydium, farmIds) => {
  try {
    // Join multiple farm IDs with comma if needed
    const ids = Array.isArray(farmIds) ? farmIds.join(',') : farmIds;
    const farmInfo = await raydium.api.fetchFarmInfoById({ ids });
    return farmInfo;
  } catch (error) {
    console.error('Error fetching farm info:', error);
    throw error;
  }
};

// Get all available token list from Raydium (mainnet only)
export const getTokenList = async (raydium) => {
  try {
    const tokenList = await raydium.api.getTokenList();
    return tokenList;
  } catch (error) {
    console.error('Error fetching token list:', error);
    throw error;
  }
};

// Get all available pools from Raydium (mainnet only)
export const getPoolList = async (raydium, options = {}) => {
  try {
    const poolList = await raydium.api.getPoolList(options);
    return poolList;
  } catch (error) {
    console.error('Error fetching pool list:', error);
    throw error;
  }
};

// Add program integration to swap function
export const performSwap = async (raydium, fromMint, toMint, amount, wallet) => {
  try {
    // Create Raydium swap transaction
    const swapResult = await raydium.api.swap({
      fromMint,
      toMint,
      amount,
    });

    // If you need to combine with your program's transaction
    const transaction = swapResult.transaction;
    
    // Get your program's instruction (implement based on your program's specific instructions)
    // const programInstruction = await yourProgramInstruction(...);
    // transaction.add(programInstruction);

    // Send the combined transaction
    const signature = await sendAndConfirmTransaction(transaction, wallet);
    return { signature, swapResult };
  } catch (error) {
    console.error('Error performing swap:', error);
    throw error;
  }
};

// Add program-specific Raydium interactions
export const createProgramPoolInteraction = async (raydium, poolId, wallet, ...programParams) => {
  try {
    // Get pool information
    const poolInfo = await getPoolInfo(raydium, poolId);
    
    // Create a transaction that interacts with both your program and the pool
    const transaction = new Transaction();
    
    // Add your program's instruction
    // const programInstruction = await yourProgramInstruction(poolInfo, ...programParams);
    // transaction.add(programInstruction);
    
    // Send the transaction
    const signature = await sendAndConfirmTransaction(transaction, wallet);
    return { signature, poolInfo };
  } catch (error) {
    console.error('Error creating program pool interaction:', error);
    throw error;
  }
};

// Add more functions for swaps and other interactions as needed 