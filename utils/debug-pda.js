import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID } from './anchorClient';

// The token mint address from the error
const TOKEN_MINT = '7kYaafKSJCkxegD2GZVDXXgXnTPsSFN2NBAeFrsbTi8k';

// Expected PDA from program logs
const EXPECTED_PDA = 'GX2VanNcKEpFhjpSVbrbEyXuPHPkt44LbQdHfey2Lue9';

// Try different encodings and combinations
const debugPdaDerivation = async () => {
  console.log('Debugging PDA derivation for token:', TOKEN_MINT);
  
  const programId = PROGRAM_ID;
  const mintPubkey = new PublicKey(TOKEN_MINT);

  // Try different seed combinations
  const options = [
    {
      name: 'bonding_curve (Buffer)',
      seeds: [Buffer.from('bonding_curve')]
    },
    {
      name: 'bonding_curve (UTF-8)',
      seeds: [Buffer.from('bonding_curve', 'utf8')]
    },
    {
      name: 'bonding_curve (ASCII)',
      seeds: [Buffer.from('bonding_curve', 'ascii')]
    },
    {
      name: 'bonding_curve + mint',
      seeds: [Buffer.from('bonding_curve'), mintPubkey.toBuffer()]
    },
    {
      name: 'bonding curve with space',
      seeds: [Buffer.from('bonding curve')]
    },
    {
      name: 'bonding_curve + token_name',
      seeds: [Buffer.from('bonding_curve'), Buffer.from('token_name')]
    },
    {
      name: 'just mint address',
      seeds: [mintPubkey.toBuffer()]
    },
    {
      name: 'token + mint',
      seeds: [Buffer.from('token'), mintPubkey.toBuffer()]
    },
    {
      name: 'BONDING_CURVE (uppercase)',
      seeds: [Buffer.from('BONDING_CURVE')]
    },
    {
      name: 'just a number 1',
      seeds: [Buffer.from([1])]
    }
  ];

  // Test each option
  const results = await Promise.all(options.map(async (option) => {
    try {
      const [pda, bump] = await PublicKey.findProgramAddress(
        option.seeds,
        programId
      );
      
      const match = pda.toString() === EXPECTED_PDA;
      
      return {
        name: option.name,
        pda: pda.toString(),
        bump,
        isMatch: match
      };
    } catch (error) {
      return {
        name: option.name,
        error: error.message
      };
    }
  }));

  // Print all results
  console.log('\nResults:');
  results.forEach(result => {
    if (result.error) {
      console.log(`${result.name}: ERROR - ${result.error}`);
    } else {
      console.log(`${result.name}: ${result.pda} (bump: ${result.bump}) ${result.isMatch ? '✅ MATCH!' : ''}`);
    }
  });

  // Check if we found a match
  const matches = results.filter(r => r.isMatch);
  if (matches.length > 0) {
    console.log('\nMatching PDA found!');
    matches.forEach(match => {
      console.log(`${match.name}: ${match.pda}`);
    });
  } else {
    console.log('\nNo matching PDA found. Try more combinations.');
  }
};

// Run the debug function
debugPdaDerivation().catch(console.error); 