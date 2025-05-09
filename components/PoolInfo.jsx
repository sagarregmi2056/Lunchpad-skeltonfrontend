import { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PROGRAM_ID, TOKEN_MINT } from '../utils/anchorClient';
import { Program } from '@project-serum/anchor';
import idl from '../utils/idl.json';
import { IconInfo, IconPrice, IconSupply, IconSlope, IconWallet, IconCopy, IconExternal, StatusBadge, LoadingSpinner } from './Icons';
import CurveVisualization from './CurveVisualization';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const BONDING_CURVE_SEED = Buffer.from('bonding_curve');

// Helper function to fix IDL for program instantiation
const prepareIdl = (originalIdl) => {
    // Deep clone to avoid modifying the original
    const fixedIdl = JSON.parse(JSON.stringify(originalIdl));

    // Fix vector type issues by recursively checking all type definitions
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
                    console.log(`Fixed vector type: ${key} from vec<${innerType}> to proper format`);
                } else if (typeof obj[key] === 'string' && obj[key] === 'pubkey') {
                    // Fix pubkey to publicKey
                    obj[key] = 'publicKey';
                    console.log(`Fixed type: ${key} from pubkey to publicKey`);
                } else {
                    fixVectorTypes(obj[key]);
                }
            });
        }
    };

    // Apply vector type fixes to the entire IDL
    fixVectorTypes(fixedIdl);

    // Ensure BondingCurve account has proper type
    const bondingCurveAccount = fixedIdl.accounts.find(a => a.name === 'BondingCurve');
    if (bondingCurveAccount) {
        bondingCurveAccount.type = {
            kind: 'struct',
            fields: [
                { name: 'authority', type: 'publicKey' },
                { name: 'initialPrice', type: 'u64' },
                { name: 'slope', type: 'u64' },
                { name: 'totalSupply', type: 'u64' },
                { name: 'tokenMint', type: 'publicKey' },
                { name: 'bump', type: 'u8' }
            ]
        };
    }

    // Fix any fields that might use snake_case instead of camelCase
    // This is a common issue between Rust and JS conventions
    const fixFieldNames = (account) => {
        if (account && account.type && account.type.fields) {
            account.type.fields.forEach(field => {
                // Fix pubkey type to publicKey
                if (field.type === 'pubkey') {
                    field.type = 'publicKey';
                }

                // Convert snake_case to camelCase if needed
                if (field.name.includes('_')) {
                    const parts = field.name.split('_');
                    const camelCaseName = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

                    // Add both versions to ensure compatibility
                    const newField = { ...field, name: camelCaseName };
                    account.type.fields.push(newField);
                }
            });
        }
    };

    // Apply field name fixes to accounts
    if (fixedIdl.accounts && Array.isArray(fixedIdl.accounts)) {
        fixedIdl.accounts.forEach(account => fixFieldNames(account));
    }

    // Fix instruction arg types
    if (fixedIdl.instructions) {
        fixedIdl.instructions.forEach(instruction => {
            if (instruction.args) {
                instruction.args.forEach(arg => {
                    // Ensure u64 types are properly set
                    if (arg.name === 'initialPrice' || arg.name === 'initial_price' ||
                        arg.name === 'slope') {
                        arg.type = 'u64';
                    }

                    // Convert vector types in args
                    if (typeof arg.type === 'string' && arg.type.startsWith('vec<')) {
                        const innerType = arg.type.substring(4, arg.type.length - 1);
                        arg.type = { vec: innerType };
                    }

                    // Fix pubkey type
                    if (arg.type === 'pubkey') {
                        arg.type = 'publicKey';
                    }
                });
            }
        });
    }

    // Ensure types array exists
    if (!fixedIdl.types) {
        fixedIdl.types = [];
    }

    // Add BondingCurve type if not already present
    const hasBondingCurveType = fixedIdl.types.some(t => t.name === 'BondingCurve');
    if (!hasBondingCurveType) {
        fixedIdl.types.push({
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
        });
    }

    // Fix existing types to ensure pubkey is changed to publicKey
    if (fixedIdl.types && Array.isArray(fixedIdl.types)) {
        fixedIdl.types.forEach(type => {
            if (type.type && type.type.fields && Array.isArray(type.type.fields)) {
                type.type.fields.forEach(field => {
                    if (field.type === 'pubkey') {
                        field.type = 'publicKey';
                    }
                });
            }
        });
    }

    console.log('IDL prepared for Pool Info component');
    return fixedIdl;
};

const PoolInfo = () => {
    const [loading, setLoading] = useState(true);
    const [poolData, setPoolData] = useState(null);
    const [error, setError] = useState(null);
    const [copySuccess, setCopySuccess] = useState('');
    const [bondingCurvePDA, setBondingCurvePDA] = useState(null);
    const [tokenMetadata, setTokenMetadata] = useState(null);

    // Helper function to format numbers
    const formatNumber = (value) => {
        if (value === undefined || value === null) return "0";

        // If it's already a number, format it
        if (typeof value === 'number') {
            if (value < 0.000001) {
                return value.toExponential(6);
            }
            return value.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6
            });
        }

        // If it's a string, try to parse it
        if (typeof value === 'string') {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                return formatNumber(num);
            }
        }

        return value.toString();
    };

    useEffect(() => {
        const fetchPoolInfo = async () => {
            try {
                setLoading(true);

                // Find the PDA for the bonding curve - using token mint in seeds
                const [pda] = await PublicKey.findProgramAddress(
                    [BONDING_CURVE_SEED, TOKEN_MINT.toBuffer()],
                    PROGRAM_ID
                );

                setBondingCurvePDA(pda);
                console.log('Bonding curve PDA:', pda.toString());

                // Create a connection for read-only operations
                const provider = {
                    connection,
                    publicKey: PublicKey.default,
                };

                // Use prepared IDL to avoid type errors
                const enhancedIdl = prepareIdl(idl);

                // Create program instance with validated IDL
                const program = new Program(enhancedIdl, PROGRAM_ID, provider);

                // Fetch the bonding curve account data
                console.log('Fetching bonding curve account data...');
                const bondingCurveAccount = await program.account.bondingCurve.fetch(pda);
                console.log('Bonding curve data:', bondingCurveAccount);

                if (!bondingCurveAccount) {
                    throw new Error('Bonding curve account not found');
                }

                // Safely convert BN to number (avoiding toNumber() which can overflow)
                // Using string conversion and parsing with decimal representation
                const initialPriceBN = bondingCurveAccount?.initialPrice?.toString() || "0";
                const slopeBN = bondingCurveAccount?.slope?.toString() || "0";
                const totalSupplyBN = bondingCurveAccount?.totalSupply?.toString() || "0";

                // Format the data for display, using string operations for safety
                const formattedData = {
                    initialPrice: parseFloat(initialPriceBN) / LAMPORTS_PER_SOL,
                    slope: parseFloat(slopeBN) / LAMPORTS_PER_SOL,
                    supply: parseFloat(totalSupplyBN) / 1e9,
                    initialPriceBN,
                    slopeBN,
                    supplyBN: totalSupplyBN,
                    authority: bondingCurveAccount?.authority?.toString() || "",
                    tokenMint: bondingCurveAccount?.tokenMint?.toString() || "",
                    bondingCurvePDA: pda.toString()
                };

                console.log('Formatted pool data:', formattedData);
                setPoolData(formattedData);
                setError(null);

                // Fetch token metadata from the blockchain using Metaplex
                const metadata = await fetchTokenMetadata(formattedData.tokenMint);
                setTokenMetadata(metadata);
                console.log('Token metadata:', metadata);
            } catch (err) {
                console.error('Error fetching pool info:', err);
                // Provide more detailed error message
                let errorMessage = 'Failed to load pool information. ';

                if (err.message.includes('Blockhash not found')) {
                    errorMessage += 'Transaction simulation failed: Blockhash not found. This is likely a temporary RPC connection issue.';
                } else if (err.message.includes('Account does not exist')) {
                    errorMessage += 'The bonding curve might not be initialized yet.';
                } else {
                    errorMessage += err.message || 'Unknown error occurred.';
                }

                setError(errorMessage);
                setPoolData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPoolInfo();

        // Refresh every 30 seconds
        const intervalId = setInterval(fetchPoolInfo, 30000);
        return () => clearInterval(intervalId);
    }, []);

    // Add function to manually retry
    const handleRetry = () => {
        setLoading(true);
        setError(null);
        // Re-run the fetch function
        const fetchPoolInfoRetry = async () => {
            try {
                // Find the PDA for the bonding curve - using token mint in seeds
                const [pda] = await PublicKey.findProgramAddress(
                    [BONDING_CURVE_SEED, TOKEN_MINT.toBuffer()],
                    PROGRAM_ID
                );

                setBondingCurvePDA(pda);
                console.log('Retry - Bonding curve PDA:', pda.toString());

                // Create a connection with a different commitment level for retry
                const retryConnection = new Connection('https://api.devnet.solana.com', 'processed');

                // Create a connection for read-only operations
                const provider = {
                    connection: retryConnection,
                    publicKey: PublicKey.default,
                };

                // Use prepared IDL to avoid type errors
                const enhancedIdl = prepareIdl(idl);

                // Create program instance with properly prepared IDL
                const program = new Program(enhancedIdl, PROGRAM_ID, provider);

                // Fetch the bonding curve account data with better error handling
                console.log('Retry - Fetching bonding curve account data...');

                try {
                    const bondingCurveAccount = await program.account.bondingCurve.fetch(pda);

                    if (!bondingCurveAccount) {
                        throw new Error('Bonding curve account not found');
                    }

                    // Process data as before
                    const initialPriceBN = bondingCurveAccount?.initialPrice?.toString() || "0";
                    const slopeBN = bondingCurveAccount?.slope?.toString() || "0";
                    const totalSupplyBN = bondingCurveAccount?.totalSupply?.toString() || "0";

                    const formattedData = {
                        initialPrice: parseFloat(initialPriceBN) / LAMPORTS_PER_SOL,
                        slope: parseFloat(slopeBN) / LAMPORTS_PER_SOL,
                        supply: parseFloat(totalSupplyBN) / 1e9,
                        initialPriceBN,
                        slopeBN,
                        supplyBN: totalSupplyBN,
                        authority: bondingCurveAccount?.authority?.toString() || "",
                        tokenMint: bondingCurveAccount?.tokenMint?.toString() || "",
                        bondingCurvePDA: pda.toString()
                    };

                    console.log('Retry - Formatted pool data:', formattedData);
                    setPoolData(formattedData);
                    setError(null);

                    // Fetch token metadata from the blockchain using Metaplex
                    const metadata = await fetchTokenMetadata(formattedData.tokenMint);
                    setTokenMetadata(metadata);
                } catch (fetchError) {
                    console.error('Error fetching account data:', fetchError);

                    // Check if the account exists using getAccountInfo directly
                    const accountInfo = await retryConnection.getAccountInfo(pda);

                    if (!accountInfo) {
                        throw new Error('Bonding curve not initialized. The account does not exist.');
                    } else {
                        throw new Error(`Account exists but could not be deserialized: ${fetchError.message}`);
                    }
                }

            } catch (err) {
                console.error('Error in retry fetch:', err);
                // Set more specific error message
                setError(`Retry failed: ${err.message || 'Unknown error'}`);
                setPoolData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPoolInfoRetry();
    };

    const calculateCurrentPrice = () => {
        if (!poolData) return 0;
        return poolData.initialPrice + (poolData.slope * poolData.supply);
    };

    const copyToClipboard = (text, type) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(`${type} copied!`);
        setTimeout(() => setCopySuccess(''), 2000);
    };

    // Function to fetch token metadata from the blockchain using Metaplex
    const fetchTokenMetadata = async (tokenMint) => {
        try {
            // Use Metaplex to fetch token metadata from the blockchain
            const mintPubkey = new PublicKey(tokenMint);

            // Find the metadata PDA for this mint
            const [metadataPDA] = await PublicKey.findProgramAddress(
                [
                    Buffer.from('metadata'),
                    new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
                    mintPubkey.toBuffer(),
                ],
                new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
            );

            console.log('Metadata PDA:', metadataPDA.toString());

            // Try to get the account info
            const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
            const accountInfo = await connection.getAccountInfo(metadataPDA);

            if (!accountInfo) {
                console.log('No metadata found for this token');

                // Fall back to checking localStorage if on-chain metadata is not found
                if (typeof window !== 'undefined') {
                    const userTokens = localStorage.getItem('userCreatedTokens') || '{}';
                    const allUserTokens = Object.values(JSON.parse(userTokens)).flat();
                    const tokenData = allUserTokens.find(t => t.mint === tokenMint);

                    if (tokenData) {
                        return {
                            name: tokenData.name || 'Unknown Token',
                            symbol: tokenData.symbol || 'TOKEN',
                            decimals: 9,
                            uri: '',
                            source: 'localStorage'
                        };
                    }
                }

                // If still not found, return default values
                return {
                    name: 'Pool Token',
                    symbol: 'TOKEN',
                    decimals: 9,
                    source: 'default'
                };
            }

            // Process the account data
            // This is a simplified parsing - metaplex SDK would be better in production
            const data = accountInfo.data;

            // Skip the first few bytes which are header/format info
            // This is a simplified approach and may need adjustment
            let nameLength = data[32];
            let name = '';
            for (let i = 0; i < nameLength; i++) {
                name += String.fromCharCode(data[33 + i]);
            }

            let symbolLength = data[64 + nameLength];
            let symbol = '';
            for (let i = 0; i < symbolLength; i++) {
                symbol += String.fromCharCode(data[65 + nameLength + i]);
            }

            return {
                name: name.trim(),
                symbol: symbol.trim(),
                decimals: 9, // Default SPL token decimals
                source: 'blockchain'
            };
        } catch (error) {
            console.error('Error fetching token metadata:', error);
            return {
                name: 'Pool Token',
                symbol: 'TOKEN',
                decimals: 9,
                source: 'error'
            };
        }
    };

    return (
        <div className="space-y-6 text-gray-200">
            <div className="flex items-center mb-2">
                <IconInfo className="h-5 w-5 mr-2 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Token Information</h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <LoadingSpinner size="lg" color="purple" />
                </div>
            ) : error ? (
                <div className="bg-red-900/30 border border-red-700/50 p-4 rounded-lg shadow-lg">
                    <div className="flex items-center mb-3">
                        <IconInfo className="h-5 w-5 mr-2 text-red-400" />
                        <p className="text-sm font-medium text-red-300">{error}</p>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                        <p className="text-xs text-red-400">You can either initialize the bonding curve first or try again later.</p>
                        <button
                            onClick={handleRetry}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-1.5 px-3 rounded-md text-sm shadow-lg hover:shadow-purple-700/20 transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            ) : poolData ? (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-md p-6 rounded-xl border border-purple-800/30 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-purple-300 mb-1">Current Market Price</h3>
                                <p className="text-3xl font-bold text-gradient">{calculateCurrentPrice().toFixed(6)} <span className="text-lg text-purple-300">SOL</span></p>
                            </div>
                            <StatusBadge status="active" />
                        </div>

                        {/* Bonding Curve Visualization */}
                        <div className="mt-5 pt-4 border-t border-purple-800/30">
                            <h4 className="text-sm font-medium text-purple-300 mb-3">Price Curve</h4>
                            <CurveVisualization
                                initialPrice={poolData.initialPrice}
                                slope={poolData.slope}
                                currentSupply={poolData.supply}
                                height="240px"
                                curveType="sigmoid"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-6 rounded-xl shadow-lg border border-purple-800/40 hover:shadow-purple-800/10 transition-shadow duration-200">
                            <div className="flex items-start">
                                <IconSupply className="h-5 w-5 mr-3 text-purple-400 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium text-purple-300 mb-2">Total Supply</h3>
                                    <p className="text-2xl font-bold text-white">{poolData.supply.toLocaleString()} <span className="text-sm text-purple-300">tokens</span></p>
                                    <div className="mt-2 text-xs text-purple-400/80">
                                        Number of tokens currently in circulation
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-6 rounded-xl shadow-lg border border-purple-800/40 hover:shadow-purple-800/10 transition-shadow duration-200">
                            <div className="flex items-start">
                                <IconPrice className="h-5 w-5 mr-3 text-purple-400 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium text-purple-300 mb-2">Initial Price</h3>
                                    <p className="text-2xl font-bold text-white">{poolData.initialPrice.toFixed(6)} <span className="text-sm text-purple-300">SOL</span></p>
                                    <div className="mt-2 text-xs text-purple-400/80">
                                        Base price when token supply is zero
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-6 rounded-xl shadow-lg border border-purple-800/40 hover:shadow-purple-800/10 transition-shadow duration-200">
                            <div className="flex items-start">
                                <IconSlope className="h-5 w-5 mr-3 text-purple-400 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium text-purple-300 mb-2">Price Slope</h3>
                                    <p className="text-2xl font-bold text-white">{poolData.slope.toFixed(6)} <span className="text-sm text-purple-300">SOL</span></p>
                                    <div className="mt-2 text-xs text-purple-400/80">
                                        Rate of price increase per token
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 p-6 rounded-xl shadow-lg border border-purple-800/40 hover:shadow-purple-800/10 transition-shadow duration-200">
                            <div className="flex items-start">
                                <IconWallet className="h-5 w-5 mr-3 text-purple-400 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium text-purple-300 mb-2">Market Liquidity</h3>
                                    <p className="text-2xl font-bold text-white">{(poolData.initialPrice * poolData.supply + 0.5 * poolData.slope * poolData.supply * poolData.supply).toFixed(4)} <span className="text-sm text-purple-300">SOL</span></p>
                                    <div className="mt-2 text-xs text-purple-400/80">
                                        Estimated total SOL value locked in curve
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
                        <div className="bg-purple-900/20 px-6 py-4 border-b border-purple-800/30">
                            <h3 className="font-medium text-white flex items-center">
                                <IconInfo className="h-4 w-4 mr-2 text-purple-400" />
                                Token Details
                            </h3>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Token Name and Symbol */}
                            {tokenMetadata && (
                                <div className="mb-5 bg-gray-800/60 rounded-lg p-4 border border-gray-700/50 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold mr-3">
                                            {tokenMetadata.symbol?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{tokenMetadata.name || 'Unknown Token'}</h3>
                                            <div className="flex items-center">
                                                <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded mr-2">
                                                    ${tokenMetadata.symbol || 'TOKEN'}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {tokenMetadata.source === 'blockchain' ? 'On-chain metadata' :
                                                        tokenMetadata.source === 'localStorage' ? 'Local metadata' :
                                                            'Default metadata'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <a
                                        href={`https://explorer.solana.com/address/${poolData?.tokenMint}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        <IconExternal className="h-5 w-5" />
                                    </a>
                                </div>
                            )}

                            {/* Token Information Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                                        <IconSupply className="h-3 w-3 mr-1 text-purple-400" />
                                        Token Mint
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-300 font-mono truncate">
                                            {poolData?.tokenMint || 'Loading...'}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(poolData?.tokenMint, 'Token mint')}
                                            className="ml-2 text-purple-400 hover:text-purple-300 transition"
                                        >
                                            <IconCopy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                                        <IconPrice className="h-3 w-3 mr-1 text-purple-400" />
                                        Current Supply
                                    </div>
                                    <p className="text-gray-300 font-medium">{formatNumber(poolData?.supply)} {tokenMetadata?.symbol || 'tokens'}</p>
                                </div>

                                <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                                        <IconPrice className="h-3 w-3 mr-1 text-purple-400" />
                                        Initial Price
                                    </div>
                                    <p className="text-gray-300 font-medium">{formatNumber(poolData?.initialPrice)} SOL</p>
                                </div>

                                <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                    <div className="text-xs text-gray-400 mb-1 flex items-center">
                                        <IconSlope className="h-3 w-3 mr-1 text-purple-400" />
                                        Price Slope
                                    </div>
                                    <p className="text-gray-300 font-medium">{formatNumber(poolData?.slope)} SOL</p>
                                </div>
                            </div>

                            {/* Bonding Curve Information */}
                            <div className="mt-4 space-y-4">
                                <h4 className="text-sm font-medium text-white">Bonding Curve Parameters</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                        <div className="text-xs text-gray-400 mb-1 flex items-center">
                                            <IconPrice className="h-3 w-3 mr-1 text-purple-400" />
                                            Initial Price
                                        </div>
                                        <p className="text-gray-300 font-medium">{formatNumber(poolData?.initialPrice)} SOL</p>
                                    </div>

                                    <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                        <div className="text-xs text-gray-400 mb-1 flex items-center">
                                            <IconSlope className="h-3 w-3 mr-1 text-purple-400" />
                                            Price Slope
                                        </div>
                                        <p className="text-gray-300 font-medium">{formatNumber(poolData?.slope)} SOL</p>
                                    </div>

                                    <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30 md:col-span-2">
                                        <div className="text-xs text-gray-400 mb-1 flex items-center">
                                            <IconWallet className="h-3 w-3 mr-1 text-purple-400" />
                                            Bonding Curve Address
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-300 font-mono truncate">
                                                {poolData?.bondingCurvePDA || 'Loading...'}
                                            </span>
                                            <button
                                                onClick={() => copyToClipboard(poolData?.bondingCurvePDA, 'Bonding curve PDA')}
                                                className="ml-2 text-purple-400 hover:text-purple-300 transition"
                                            >
                                                <IconCopy className="h-4 w-4" />
                                            </button>
                                            <a
                                                href={`https://explorer.solana.com/address/${poolData?.bondingCurvePDA}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-2 text-purple-400 hover:text-purple-300 transition"
                                            >
                                                <IconExternal className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/10 to-indigo-900/10 p-5 rounded-xl border border-purple-800/30 shadow-md">
                        <h3 className="text-sm font-medium text-purple-300 mb-3">How Bonding Curves Work</h3>
                        <p className="text-gray-300 text-sm">
                            This token uses a dynamic pricing model based on a bonding curve. The price increases as more tokens are purchased and decreases as tokens are sold back to the curve. All transactions are executed on-chain with SOL as the base currency.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-400">
                            <div>• Token price is determined by the curve formula</div>
                            <div>• Tokens are minted when purchased</div>
                            <div>• Tokens are burned when sold back</div>
                            <div>• All transactions are executed instantly</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default PoolInfo; 