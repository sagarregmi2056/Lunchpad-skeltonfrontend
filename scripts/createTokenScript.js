import { Connection, Keypair } from '@solana/web3.js';
import { createTokenWithMetadata } from '../utils/createToken';
import * as fs from 'fs';

const main = async () => {
    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Load your keypair from the filesystem
    const secretKeyString = fs.readFileSync('/home/saga/.config/solana/id.json', 'utf8');
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    const keypair = Keypair.fromSecretKey(secretKey);

    console.log('Creating token...');
    const result = await createTokenWithMetadata(
        connection,
        keypair,
        9, // decimals
        "My Custom Token", // name
        "MCT", // symbol
        "https://my-token-metadata.com" // URI (optional)
    );

    if (result.success) {
        console.log('Token created successfully!');
        console.log('Mint address:', result.mint.toString());
        console.log('Transaction signature:', result.signature);
    } else {
        console.error('Failed to create token:', result.error);
    }
};

main().catch(console.error); 