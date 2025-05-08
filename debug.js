import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import pkg from '@project-serum/anchor';
const { BN } = pkg;
import fs from 'fs';

// Program ID from your deployed contract
const PROGRAM_ID = new PublicKey('ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4');

// Expected and actual PDAs from the error
const EXPECTED_PDA = '4BuwHFYtXZo7xtZW5rp4NrQLwCGUfTxkvhuqpJnbstWd';
const ACTUAL_PDA = 'DxoVvbJv4mm1bQ73Wf1UZ1UK7yE9coG9BRv6ZYx7DEdc';

// Function to try different seeds
async function testSeeds() {
  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('Expected PDA:', EXPECTED_PDA);
  console.log('Actual PDA from error:', ACTUAL_PDA);
  console.log('\nTrying different seed combinations...\n');

  // Test a wide variety of seeds
  const seedTests = [
    { name: 'bonding_curve (lowercase, utf8)', seeds: [Buffer.from('bonding_curve', 'utf8')] },
    { name: 'bonding_curve (lowercase, ascii)', seeds: [Buffer.from('bonding_curve', 'ascii')] },
    { name: 'bonding_curve (lowercase, binary)', seeds: [Buffer.from('bonding_curve', 'binary')] },
    { name: 'BONDING_CURVE (uppercase)', seeds: [Buffer.from('BONDING_CURVE')] },
    { name: 'Bonding_Curve (mixed case)', seeds: [Buffer.from('Bonding_Curve')] },
    { name: 'bondingcurve (no underscore)', seeds: [Buffer.from('bondingcurve')] },
    { name: 'bonding curve (with space)', seeds: [Buffer.from('bonding curve')] },
    { name: 'bonding-curve (with hyphen)', seeds: [Buffer.from('bonding-curve')] },
    { name: 'bonding.curve (with dot)', seeds: [Buffer.from('bonding.curve')] },
    { name: 'empty string', seeds: [Buffer.from('')] },
    { name: 'number 0', seeds: [Buffer.from([0])] },
    { name: 'number 1', seeds: [Buffer.from([1])] },
    { name: 'bytes [0, 1, 2]', seeds: [Buffer.from([0, 1, 2])] },
  ];

  // Additional tests with different case
  for (let i = 0; i < 5; i++) {
    const str = 'bonding_curve';
    const mixed = str.split('').map((c, idx) => idx % 2 === i ? c.toUpperCase() : c).join('');
    seedTests.push({
      name: `Mixed case variant ${i+1}: ${mixed}`,
      seeds: [Buffer.from(mixed)]
    });
  }

  // Test with all possible ASCII characters (printable ones)
  for (let i = 32; i <= 126; i++) {
    const char = String.fromCharCode(i);
    seedTests.push({
      name: `Single char: '${char}' (ASCII ${i})`,
      seeds: [Buffer.from([i])]
    });
  }

  const results = [];

  for (const test of seedTests) {
    try {
      const [pda, bump] = await PublicKey.findProgramAddress(
        test.seeds,
        PROGRAM_ID
      );

      // Check if this matches either expected or actual PDA
      const matchesExpected = pda.toString() === EXPECTED_PDA;
      const matchesActual = pda.toString() === ACTUAL_PDA;

      results.push({
        name: test.name,
        pda: pda.toString(),
        bump,
        matchesExpected,
        matchesActual
      });

      if (matchesExpected || matchesActual) {
        console.log(`🔍 MATCH FOUND for ${test.name}:`);
        console.log(`   PDA: ${pda.toString()}`);
        console.log(`   Bump: ${bump}`);
        console.log(`   Matches Expected: ${matchesExpected}`);
        console.log(`   Matches Actual: ${matchesActual}`);
        console.log();
      }
    } catch (e) {
      results.push({
        name: test.name,
        error: e.message
      });
    }
  }

  // Print summary of all results
  console.log('\n===== ALL RESULTS =====');
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.name}: ERROR - ${result.error}`);
    } else {
      console.log(`${result.matchesExpected || result.matchesActual ? '✅' : '❌'} ${result.name}: ${result.pda} (bump: ${result.bump})`);
    }
  });

  // Save to file for reference
  fs.writeFileSync('pda-debug-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to pda-debug-results.json');
}

testSeeds().catch(console.error); 