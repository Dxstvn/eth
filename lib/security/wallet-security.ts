import { ethers, Mnemonic, parseUnits, parseEther, BigNumber, type TransactionRequest } from 'ethers';
import CryptoJS from 'crypto-js';
import { secureRandom, advancedEncryption, digitalSignature, EncryptionResult } from './crypto-utils';
import { secureLocalStorage } from './secure-storage';

// Wallet security configuration
export const WALLET_SECURITY_CONFIG = {
  ENCRYPTION_ITERATIONS: 100000,
  KEY_DERIVATION_SALT_SIZE: 32,
  BACKUP_ENCRYPTION_ROUNDS: 3,
  SIGNATURE_EXPIRY: 5 * 60 * 1000, // 5 minutes
};

// Encrypted wallet data structure
export interface EncryptedWalletData {
  encryptedPrivateKey: EncryptionResult;
  publicKey: string;
  address: string;
  network: string;
  keyVersion: number;
  createdAt: number;
  lastUsed?: number;
}

// Wallet recovery data
export interface WalletRecoveryData {
  encryptedMnemonic: EncryptionResult;
  encryptedPrivateKey: EncryptionResult;
  publicKey: string;
  address: string;
  derivationPath: string;
  network: string;
}

// Secure wallet key manager
export class SecureWalletKeyManager {
  private static instance: SecureWalletKeyManager;
  private storageKey = 'secure_wallet_keys';
  
  private constructor() {}
  
  static getInstance(): SecureWalletKeyManager {
    if (!SecureWalletKeyManager.instance) {
      SecureWalletKeyManager.instance = new SecureWalletKeyManager();
    }
    return SecureWalletKeyManager.instance;
  }
  
  // Generate secure wallet
  async generateSecureWallet(
    password: string,
    network: string = 'ethereum'
  ): Promise<{ wallet: ethers.Wallet; encryptedData: EncryptedWalletData }> {
    // Generate wallet with secure entropy
    const entropy = secureRandom.generateBytes(32);
    const wallet = ethers.Wallet.createRandom({ extraEntropy: entropy });
    
    // Encrypt private key
    const encryptedPrivateKey = advancedEncryption.encryptData(
      wallet.privateKey,
      password,
      { includeSalt: true, includeHMAC: true }
    );
    
    const encryptedData: EncryptedWalletData = {
      encryptedPrivateKey,
      publicKey: wallet.publicKey,
      address: wallet.address,
      network,
      keyVersion: 1,
      createdAt: Date.now(),
    };
    
    return { wallet, encryptedData };
  }
  
  // Import wallet from private key
  async importWalletFromPrivateKey(
    privateKey: string,
    password: string,
    network: string = 'ethereum'
  ): Promise<EncryptedWalletData> {
    // Validate private key
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      throw new Error('Invalid private key format');
    }
    
    const wallet = new ethers.Wallet(privateKey);
    
    // Encrypt private key
    const encryptedPrivateKey = advancedEncryption.encryptData(
      privateKey,
      password,
      { includeSalt: true, includeHMAC: true }
    );
    
    return {
      encryptedPrivateKey,
      publicKey: wallet.publicKey,
      address: wallet.address,
      network,
      keyVersion: 1,
      createdAt: Date.now(),
    };
  }
  
  // Import wallet from mnemonic
  async importWalletFromMnemonic(
    mnemonic: string,
    password: string,
    derivationPath: string = "m/44'/60'/0'/0/0",
    network: string = 'ethereum'
  ): Promise<{ encryptedData: EncryptedWalletData; recoveryData: WalletRecoveryData }> {
    // Validate mnemonic
    if (!Mnemonic.isValidMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    
    const wallet = ethers.Wallet.fromPhrase(mnemonic, derivationPath);
    
    // Encrypt both mnemonic and private key
    const encryptedMnemonic = advancedEncryption.encryptData(
      mnemonic,
      password + 'mnemonic',
      { includeSalt: true, includeHMAC: true }
    );
    
    const encryptedPrivateKey = advancedEncryption.encryptData(
      wallet.privateKey,
      password,
      { includeSalt: true, includeHMAC: true }
    );
    
    const encryptedData: EncryptedWalletData = {
      encryptedPrivateKey,
      publicKey: wallet.publicKey,
      address: wallet.address,
      network,
      keyVersion: 1,
      createdAt: Date.now(),
    };
    
    const recoveryData: WalletRecoveryData = {
      encryptedMnemonic,
      encryptedPrivateKey,
      publicKey: wallet.publicKey,
      address: wallet.address,
      derivationPath,
      network,
    };
    
    return { encryptedData, recoveryData };
  }
  
  // Decrypt and recover wallet
  async decryptWallet(
    encryptedData: EncryptedWalletData,
    password: string
  ): Promise<ethers.Wallet> {
    try {
      const privateKey = advancedEncryption.decryptData(
        encryptedData.encryptedPrivateKey,
        password
      );
      
      const wallet = new ethers.Wallet(privateKey);
      
      // Verify address matches
      if (wallet.address !== encryptedData.address) {
        throw new Error('Decrypted wallet address mismatch');
      }
      
      return wallet;
    } catch (error) {
      throw new Error('Failed to decrypt wallet - incorrect password or corrupted data');
    }
  }
  
  // Store encrypted wallet
  storeEncryptedWallet(
    walletId: string,
    encryptedData: EncryptedWalletData
  ): void {
    const wallets = this.getStoredWallets();
    wallets[walletId] = {
      ...encryptedData,
      lastUsed: Date.now(),
    };
    
    secureLocalStorage.setItem(this.storageKey, wallets);
  }
  
  // Get stored wallets
  getStoredWallets(): Record<string, EncryptedWalletData> {
    return secureLocalStorage.getItem(this.storageKey) || {};
  }
  
  // Remove wallet
  removeWallet(walletId: string): void {
    const wallets = this.getStoredWallets();
    delete wallets[walletId];
    secureLocalStorage.setItem(this.storageKey, wallets);
  }
  
  // Change wallet password
  async changeWalletPassword(
    walletId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const wallets = this.getStoredWallets();
    const walletData = wallets[walletId];
    
    if (!walletData) {
      throw new Error('Wallet not found');
    }
    
    // Decrypt with old password
    const wallet = await this.decryptWallet(walletData, oldPassword);
    
    // Re-encrypt with new password
    const encryptedPrivateKey = advancedEncryption.encryptData(
      wallet.privateKey,
      newPassword,
      { includeSalt: true, includeHMAC: true }
    );
    
    // Update stored data
    wallets[walletId] = {
      ...walletData,
      encryptedPrivateKey,
      keyVersion: walletData.keyVersion + 1,
    };
    
    secureLocalStorage.setItem(this.storageKey, wallets);
  }
}

// Wallet transaction signing with security
export class SecureWalletSigner {
  private keyManager = SecureWalletKeyManager.getInstance();
  
  // Sign transaction with additional security checks
  async signTransaction(
    walletId: string,
    transaction: TransactionRequest,
    password: string,
    securityChecks?: {
      maxGasPrice?: string;
      maxValue?: string;
      allowedRecipients?: string[];
    }
  ): Promise<string> {
    // Get encrypted wallet
    const wallets = this.keyManager.getStoredWallets();
    const walletData = wallets[walletId];
    
    if (!walletData) {
      throw new Error('Wallet not found');
    }
    
    // Security checks
    if (securityChecks) {
      if (securityChecks.maxGasPrice && transaction.gasPrice) {
        const gasPrice = BigNumber.from(transaction.gasPrice);
        const maxGasPrice = parseUnits(securityChecks.maxGasPrice, 'gwei');
        
        if (gasPrice.gt(maxGasPrice)) {
          throw new Error('Gas price exceeds maximum allowed');
        }
      }
      
      if (securityChecks.maxValue && transaction.value) {
        const value = BigNumber.from(transaction.value);
        const maxValue = parseEther(securityChecks.maxValue);
        
        if (value.gt(maxValue)) {
          throw new Error('Transaction value exceeds maximum allowed');
        }
      }
      
      if (securityChecks.allowedRecipients && transaction.to) {
        if (!securityChecks.allowedRecipients.includes(transaction.to.toLowerCase())) {
          throw new Error('Recipient not in allowed list');
        }
      }
    }
    
    // Decrypt wallet
    const wallet = await this.keyManager.decryptWallet(walletData, password);
    
    // Sign transaction
    const signedTransaction = await wallet.signTransaction(transaction);
    
    // Clear wallet from memory
    wallet.privateKey = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    return signedTransaction;
  }
  
  // Sign message with wallet
  async signMessage(
    walletId: string,
    message: string,
    password: string
  ): Promise<string> {
    const wallets = this.keyManager.getStoredWallets();
    const walletData = wallets[walletId];
    
    if (!walletData) {
      throw new Error('Wallet not found');
    }
    
    // Decrypt wallet
    const wallet = await this.keyManager.decryptWallet(walletData, password);
    
    // Sign message
    const signature = await wallet.signMessage(message);
    
    // Clear wallet from memory
    wallet.privateKey = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    return signature;
  }
}

// Hardware Security Module simulation
export class HSMSimulator {
  private keys: Map<string, string> = new Map();
  private securityRandom = secureRandom;
  
  // Generate secure key pair
  generateKeyPair(keyId: string): { publicKey: string; keyId: string } {
    const keyPair = digitalSignature.generateKeyPair();
    
    // Store private key securely (in real HSM, this would be in hardware)
    this.keys.set(keyId, keyPair.privateKey);
    
    return {
      publicKey: keyPair.publicKey,
      keyId,
    };
  }
  
  // Sign data with HSM key
  signWithHSM(keyId: string, data: string): string {
    const privateKey = this.keys.get(keyId);
    if (!privateKey) {
      throw new Error('Key not found in HSM');
    }
    
    return digitalSignature.signMessage(data, privateKey);
  }
  
  // Verify signature
  verifySignature(data: string, signature: string, publicKey: string): boolean {
    return digitalSignature.verifySignature(data, signature, publicKey);
  }
  
  // Generate secure random for nonces
  generateNonce(): string {
    return this.securityRandom.generateString(32);
  }
  
  // Secure key derivation
  deriveKey(masterKey: string, derivationPath: string): string {
    return CryptoJS.PBKDF2(masterKey, derivationPath, {
      keySize: 256 / 32,
      iterations: WALLET_SECURITY_CONFIG.ENCRYPTION_ITERATIONS,
    }).toString();
  }
}

// Export instances
export const secureWalletKeyManager = SecureWalletKeyManager.getInstance();
export const secureWalletSigner = new SecureWalletSigner();
export const hsmSimulator = new HSMSimulator();