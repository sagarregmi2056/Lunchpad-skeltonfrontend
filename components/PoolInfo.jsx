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
                const initialPriceBN = bondingCurveAccount.initialPrice.toString();
                const slopeBN = bondingCurveAccount.slope.toString();
                const totalSupplyBN = bondingCurveAccount.totalSupply.toString();

                // Format the data for display, using string operations for safety
                const formattedData = {
                    initialPrice: parseFloat(initialPriceBN) / LAMPORTS_PER_SOL,
                    slope: parseFloat(slopeBN) / LAMPORTS_PER_SOL,
                    supply: parseFloat(totalSupplyBN) / 1e9,
                    initialPriceBN,
                    slopeBN,
                    supplyBN: totalSupplyBN,
                    authority: bondingCurveAccount.authority.toString(),
                    tokenMint: bondingCurveAccount.tokenMint.toString(),
                    bondingCurvePDA: pda.toString()
                };

                console.log('Formatted pool data:', formattedData);
                setPoolData(formattedData);
                setError(null);
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
                    const initialPriceBN = bondingCurveAccount.initialPrice.toString();
                    const slopeBN = bondingCurveAccount.slope.toString();
                    const totalSupplyBN = bondingCurveAccount.totalSupply.toString();

                    const formattedData = {
                        initialPrice: parseFloat(initialPriceBN) / LAMPORTS_PER_SOL,
                        slope: parseFloat(slopeBN) / LAMPORTS_PER_SOL,
                        supply: parseFloat(totalSupplyBN) / 1e9,
                        initialPriceBN,
                        slopeBN,
                        supplyBN: totalSupplyBN,
                        authority: bondingCurveAccount.authority.toString(),
                        tokenMint: bondingCurveAccount.tokenMint.toString(),
                        bondingCurvePDA: pda.toString()
                    };

                    console.log('Retry - Formatted pool data:', formattedData);
                    setPoolData(formattedData);
                    setError(null);
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
                            <div className="relative">
                                {copySuccess === 'Token mint' && (
                                    <div className="absolute right-0 top-0 text-xs text-green-400 bg-green-900/40 px-2 py-1 rounded animate-fade-in-out">
                                        Copied!
                                    </div>
                                )}
                                <span className="text-sm font-medium text-purple-300">Token Mint Address</span>
                                <div className="mt-1.5 p-3 bg-gray-800/80 rounded-lg border border-gray-700/60 flex justify-between items-center">
                                    <p className="text-xs font-mono text-gray-300 truncate">{poolData.tokenMint}</p>
                                    <button
                                        className="ml-2 text-purple-400 hover:text-purple-300 transition-colors p-1.5 rounded-full hover:bg-purple-900/30"
                                        onClick={() => copyToClipboard(poolData.tokenMint, 'Token mint')}
                                    >
                                        <IconCopy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                {copySuccess === 'Authority' && (
                                    <div className="absolute right-0 top-0 text-xs text-green-400 bg-green-900/40 px-2 py-1 rounded animate-fade-in-out">
                                        Copied!
                                    </div>
                                )}
                                <span className="text-sm font-medium text-purple-300">Authority</span>
                                <div className="mt-1.5 p-3 bg-gray-800/80 rounded-lg border border-gray-700/60 flex justify-between items-center">
                                    <p className="text-xs font-mono text-gray-300 truncate">{poolData.authority}</p>
                                    <button
                                        className="ml-2 text-purple-400 hover:text-purple-300 transition-colors p-1.5 rounded-full hover:bg-purple-900/30"
                                        onClick={() => copyToClipboard(poolData.authority, 'Authority')}
                                    >
                                        <IconCopy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-700/40">
                                <span className="text-sm font-medium text-purple-300">Explorer Links</span>
                                <div className="mt-2 flex flex-wrap gap-3">
                                    <a
                                        href={`https://explorer.solana.com/address/${poolData.tokenMint}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-purple-900/30 text-purple-300 hover:bg-purple-800/40 transition-colors border border-purple-800/40"
                                    >
                                        <IconExternal className="h-4 w-4 mr-1.5" />
                                        View Token on Explorer
                                    </a>

                                    <a
                                        href={`https://explorer.solana.com/address/${PROGRAM_ID.toString()}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/40 transition-colors border border-indigo-800/40"
                                    >
                                        <IconExternal className="h-4 w-4 mr-1.5" />
                                        View Program on Explorer
                                    </a>
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