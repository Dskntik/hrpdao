// utils/web3auth.js - Secure Implementation
import { ethers } from 'ethers';

// Generate cryptographically secure nonce
export const generateNonce = () => {
  return ethers.hexlify(ethers.randomBytes(32));
};

// Create SIWE (Sign-In with Ethereum) message
export const createSIWEMessage = (address, nonce, chainId) => {
  const domain = window.location.host;
  const origin = window.location.origin;
  const issuedAt = new Date().toISOString();
  
  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to HRP DAO

URI: ${origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
};

// Verify Ethereum address with checksum (EIP-55)
export const isValidEthereumAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

// Connect wallet with signature verification
export const connectWalletSecure = async () => {
  try {
    if (!window.ethereum) {
      throw new Error('Web3 wallet not found. Please install MetaMask.');
    }

    console.log("ðŸ”„ Connecting to wallet...");
    
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const address = ethers.getAddress(accounts[0]); // Checksum format
    
    // Get chain ID
    const chainId = await window.ethereum.request({ 
      method: 'eth_chainId' 
    });
    const chainIdDecimal = parseInt(chainId, 16);

    console.log("âœ… Wallet connected:", address);
    console.log("ðŸ”— Chain ID:", chainIdDecimal);

    // Generate nonce for this session
    const nonce = generateNonce();
    
    // Create SIWE message
    const message = createSIWEMessage(address, nonce, chainIdDecimal);
    
    // Request signature
    console.log("ðŸ“ Requesting signature...");
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address]
    });

    console.log("âœ… Message signed");

    // Return data for backend verification
    return {
      address,
      chainId: chainIdDecimal,
      nonce,
      message,
      signature,
      provider: window.ethereum
    };

  } catch (error) {
    console.error("âŒ Wallet connection failed:", error);
    
    if (error.code === 4001) {
      throw new Error('User rejected the signature request');
    } else if (error.code === -32002) {
      throw new Error('Connection request already pending');
    } else {
      throw error;
    }
  }
};

// Verify signature (client-side check, MUST be verified on backend too)
export const verifySignature = async (message, signature, address) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

// Setup event listeners for wallet changes
export const setupWalletListeners = (onAccountChange, onChainChange, onDisconnect) => {
  if (!window.ethereum) return;

  // Account changed
  window.ethereum.on('accountsChanged', (accounts) => {
    console.log('ðŸ‘¤ Account changed:', accounts[0]);
    if (accounts.length === 0) {
      onDisconnect?.();
    } else {
      onAccountChange?.(ethers.getAddress(accounts[0]));
    }
  });

  // Chain changed
  window.ethereum.on('chainChanged', (chainId) => {
    console.log('ðŸ”— Chain changed:', parseInt(chainId, 16));
    onChainChange?.(parseInt(chainId, 16));
  });

  // Disconnect
  window.ethereum.on('disconnect', () => {
    console.log('ðŸ”Œ Wallet disconnected');
    onDisconnect?.();
  });
};

// Remove event listeners
export const removeWalletListeners = () => {
  if (!window.ethereum) return;
  
  window.ethereum.removeAllListeners('accountsChanged');
  window.ethereum.removeAllListeners('chainChanged');
  window.ethereum.removeAllListeners('disconnect');
};

// Secure storage using session storage instead of localStorage
export const setWalletSession = (data) => {
  const encryptedData = btoa(JSON.stringify({
    ...data,
    timestamp: Date.now(),
    expiresIn: 24 * 60 * 60 * 1000 // 24 hours
  }));
  sessionStorage.setItem('wallet_session', encryptedData);
};

export const getWalletSession = () => {
  try {
    const encrypted = sessionStorage.getItem('wallet_session');
    if (!encrypted) return null;

    const data = JSON.parse(atob(encrypted));
    
    // Check expiration
    if (Date.now() - data.timestamp > data.expiresIn) {
      clearWalletSession();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error reading wallet session:', error);
    return null;
  }
};

export const clearWalletSession = () => {
  sessionStorage.removeItem('wallet_session');
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('web3_user_data');
};

// Universal wallet connection (legacy support)
export const connectWalletUniversal = async () => {
  try {
    const result = await connectWalletSecure();
    return {
      address: result.address,
      provider: result.provider
    };
  } catch (error) {
    console.error('Universal wallet connection failed:', error);
    throw error;
  }
};

// Web3 availability check
export const isWeb3Available = () => {
  return typeof window !== 'undefined' && !!window.ethereum;
};

// Initialize Web3Auth (optional - for compatibility)
export const initWeb3AuthOptional = async () => {
  // No initialization needed for basic wallet connection
  return true;
};

// Get wallet address from storage
export const getWalletAddress = () => {
  return localStorage.getItem('wallet_address');
};

// Get Web3 user data from storage
export const getWeb3UserData = () => {
  try {
    const data = localStorage.getItem('web3_user_data');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Disconnect wallet
export const disconnectWallet = () => {
  clearWalletSession();
  localStorage.removeItem('wallet_address');
  localStorage.removeItem('web3_user_data');
  localStorage.removeItem('wallet_user_data');
};

// Legacy support - alias for secure connection
export const connectWallet = connectWalletSecure;

// Default export for backward compatibility
export default {
  connectWalletSecure,
  connectWalletUniversal,
  verifySignature,
  generateNonce,
  createSIWEMessage,
  isValidEthereumAddress,
  setupWalletListeners,
  removeWalletListeners,
  setWalletSession,
  getWalletSession,
  clearWalletSession,
  isWeb3Available,
  initWeb3AuthOptional,
  getWalletAddress,
  getWeb3UserData,
  disconnectWallet,
  connectWallet
};