import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import InitializeBondingCurve from '../components/InitializeBondingCurve';
import { Box, Heading, Alert, Button, Input, Text, Stack, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { useToast } from '@chakra-ui/react';
import { AlertIcon } from '@chakra-ui/react';
import { Radio, RadioGroup } from '@chakra-ui/radio';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@project-serum/anchor';
import { initializeBondingCurve } from '../utils/anchorClient';
import { initializeTokenBondingCurve, initializeWithRawInstructions } from '../utils/specializedInitialize';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export default function Admin() {
  const { publicKey, signTransaction, signAllTransactions, signMessage } = useWallet();
  const [tokenMint, setTokenMint] = useState('EqcNsHzeNpAKJLLq4HzDAyHmBEQaA6ttqGLRwdnEprXA');
  const [initialPrice, setInitialPrice] = useState('1');
  const [slope, setSlope] = useState('0.1');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('specialized');
  const toast = useToast();

  const handleInitializeSpecificToken = async () => {
    try {
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      if (!tokenMint) {
        throw new Error('Please enter a token mint address');
      }

      // Validate mint address
      try {
        new PublicKey(tokenMint);
      } catch (e) {
        throw new Error('Invalid token mint address');
      }

      setLoading(true);
      setStatus('Initializing bonding curve...');

      // Create a wallet adapter object
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
        signMessage
      };

      // Convert price and slope to lamports
      const initialPriceInSol = parseFloat(initialPrice);
      const slopeInSol = parseFloat(slope);

      // Convert to lamports as integers
      const priceInLamports = new BN(Math.floor(initialPriceInSol * LAMPORTS_PER_SOL));
      const slopeInLamports = new BN(Math.floor(slopeInSol * LAMPORTS_PER_SOL));

      // Choose initialization method based on user selection
      let result;
      if (method === 'specialized') {
        result = await initializeTokenBondingCurve(
          wallet,
          priceInLamports,
          slopeInLamports,
          new PublicKey(tokenMint)
        );
      } else if (method === 'raw') {
        result = await initializeWithRawInstructions(
          wallet,
          priceInLamports,
          slopeInLamports,
          new PublicKey(tokenMint)
        );
      } else {
        // Default method (original)
        result = await initializeBondingCurve(
          wallet,
          priceInLamports,
          slopeInLamports,
          new PublicKey(tokenMint)
        );
      }

      if (result.success) {
        setStatus(`Success! Bonding curve initialized.
          ${result.signature ? `Transaction: ${result.signature}` : ''}
          ${result.address ? `Address: ${result.address}` : ''}`);
        
        toast({
          title: 'Success',
          description: 'Bonding curve initialized successfully',
          status: 'success',
          duration: 9000,
          isClosable: true,
        });
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          try {
            const storedTokens = localStorage.getItem('userCreatedTokens') || '{}';
            const tokensObj = JSON.parse(storedTokens);
            
            if (!tokensObj[publicKey.toString()]) {
              tokensObj[publicKey.toString()] = [];
            }
            
            // Find if token already exists
            const tokenIndex = tokensObj[publicKey.toString()].findIndex(t => 
              t.mint === tokenMint
            );
            
            if (tokenIndex >= 0) {
              // Update existing token
              tokensObj[publicKey.toString()][tokenIndex] = {
                ...tokensObj[publicKey.toString()][tokenIndex],
                bondingCurve: result.address,
                bondingCurveUrl: result.explorerUrl,
                initialPrice: initialPrice,
                slope: slope,
                updatedAt: new Date().toISOString()
              };
            } else {
              // Add new token
              tokensObj[publicKey.toString()].push({
                mint: tokenMint,
                bondingCurve: result.address,
                bondingCurveUrl: result.explorerUrl,
                initialPrice: initialPrice,
                slope: slope,
                createdAt: new Date().toISOString()
              });
            }
            
            localStorage.setItem('userCreatedTokens', JSON.stringify(tokensObj));
          } catch (e) {
            console.error('Error saving to localStorage:', e);
          }
        }
      } else {
        throw new Error(result.error || "Failed to initialize bonding curve");
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus(`Error: ${error.message}`);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Admin Panel - Bond Launcher</title>
      </Head>

      <Box p={5} maxW="container.lg" mx="auto">
        <Heading mb={6}>Admin Panel</Heading>
        
        {/* Guide section */}
        <Box p={6} mb={8} borderWidth="1px" borderRadius="lg" bg="blackAlpha.300">
          <Heading size="md" mb={4}>How to Initialize Your Bonding Curve</Heading>
          <Text mb={4} color="gray.400">
            Your token {tokenMint} was created successfully, but the bonding curve needs to be initialized separately.
          </Text>
          
          <Stack spacing={3}>
            <Alert status="info" variant="left-accent" borderRadius="md">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Token Created Successfully</Text>
                <Text fontSize="sm">
                  Your token was created with address: <Text as="span" fontWeight="bold">{tokenMint}</Text>
                </Text>
              </Box>
            </Alert>
            
            <Text>Follow these steps to initialize your bonding curve:</Text>
            
            <Stack pl={4} spacing={2} mt={2}>
              <Text>1. Make sure your wallet is connected</Text>
              <Text>2. Keep the token mint address in the field below</Text>
              <Text>3. Set the initial price (recommended: 1 SOL)</Text>
              <Text>4. Set the slope factor (recommended: 0.1 SOL)</Text>
              <Text>5. Use the "Specialized" method for best results</Text>
              <Text>6. Click "Initialize Bonding Curve" and approve the transaction</Text>
            </Stack>
          </Stack>
        </Box>
        
        <Stack spacing={8}>
          <Box p={6} borderWidth="1px" borderRadius="lg" bg="blackAlpha.300">
            <Heading size="md" mb={4}>Initialize Specific Token Bonding Curve</Heading>
            <Text mb={4} color="gray.400">
              Use this form to initialize a bonding curve for your token
            </Text>
            
            <VStack spacing={4} align="stretch">
              <Box>
                <Text mb={1} fontWeight="medium">Token Mint Address</Text>
                <Input 
                  value={tokenMint}
                  onChange={(e) => setTokenMint(e.target.value)}
                  placeholder="Enter token mint address"
                  isReadOnly={loading}
                />
              </Box>
              
              <Box>
                <Text mb={1} fontWeight="medium">Initial Price (SOL)</Text>
                <Input 
                  value={initialPrice}
                  onChange={(e) => setInitialPrice(e.target.value)}
                  placeholder="1"
                  type="number"
                  step="0.000001"
                  isReadOnly={loading}
                />
              </Box>
              
              <Box>
                <Text mb={1} fontWeight="medium">Slope (SOL)</Text>
                <Input 
                  value={slope}
                  onChange={(e) => setSlope(e.target.value)}
                  placeholder="0.1"
                  type="number"
                  step="0.000001"
                  isReadOnly={loading}
                />
              </Box>
              
              <Box>
                <Text mb={2} fontWeight="medium">Initialization Method</Text>
                <RadioGroup onChange={setMethod} value={method}>
                  <Stack direction="row" spacing={5}>
                    <Radio value="specialized">Specialized (Recommended)</Radio>
                    <Radio value="raw">Raw Instructions</Radio>
                    <Radio value="original">Original</Radio>
                  </Stack>
                </RadioGroup>
                <Text mt={1} fontSize="xs" color="gray.400">
                  {method === 'specialized' 
                    ? 'Uses a fixed IDL structure to avoid type errors'
                    : method === 'raw' 
                      ? 'Builds raw transaction instructions manually'
                      : 'Uses the original initialization method'
                  }
                </Text>
              </Box>
              
              <Button
                colorScheme="purple"
                isLoading={loading}
                loadingText="Initializing..."
                onClick={handleInitializeSpecificToken}
              >
                Initialize Bonding Curve
              </Button>
              
              {status && (
                <Alert status={status.includes('Error') ? 'error' : 'success'}>
                  <AlertIcon />
                  {status}
                </Alert>
              )}
            </VStack>
          </Box>

          <Box p={6} borderWidth="1px" borderRadius="lg" bg="blackAlpha.300">
            <Heading size="md" mb={4}>Token List Initialize</Heading>
            <Text mb={4} color="gray.400">
              Choose from your existing tokens and initialize bonding curves
            </Text>
            <InitializeBondingCurve />
          </Box>
        </Stack>
      </Box>
    </Layout>
  );
} 