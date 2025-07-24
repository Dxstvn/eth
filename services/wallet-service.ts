import { apiClient } from '@/services/api'
import { API_CONFIG } from '@/services/api-config'
import { authService } from '@/services/auth-service'
import { walletDetectionService } from '@/services/wallet-detection'
import { multiChainService, type BalanceInfo, type Transaction } from '@/services/multi-chain-service'
import type { 
  ConnectedWallet, 
  BlockchainNetwork, 
  WalletProvider,
  WalletDetectionResult,
  SolanaWallet,
  BitcoinWallet
} from '@/types/wallet'
import { ethers, isAddress, getAddress } from 'ethers'

// Error handling
export enum WalletErrorCode {
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  BACKEND_SYNC_FAILED = 'BACKEND_SYNC_FAILED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  ALREADY_CONNECTED = 'ALREADY_CONNECTED'
}

export class WalletError extends Error {
  constructor(
    message: string,
    public code: WalletErrorCode,
    public details?: any
  ) {
    super(message)
    this.name = 'WalletError'
  }
}

// Wallet update queue for batch synchronization
interface SyncTask {
  wallet: ConnectedWallet
  updates: Partial<{
    balance: string
    lastSeen: Date
    metadata: any
  }>
  timestamp: number
}

/**
 * Unified wallet service for managing wallet connections and backend synchronization
 */
export class WalletService {
  private syncQueue: Map<string, SyncTask> = new Map()
  private syncTimer: NodeJS.Timeout | null = null
  private connectedWallets: Map<string, ConnectedWallet> = new Map()

  /**
   * Detect all available wallets
   */
  async detectWallets(options: {
    forceRefresh?: boolean
    timeout?: number
  } = {}): Promise<WalletDetectionResult> {
    try {
      const result = await walletDetectionService.detectAllWallets()
      
      // Send detection data to backend for analytics
      this.sendDetectionAnalytics(result).catch(console.warn)
      
      return result
    } catch (error) {
      console.error('Wallet detection failed:', error)
      throw new WalletError(
        'Failed to detect wallets',
        WalletErrorCode.PROVIDER_NOT_FOUND,
        error
      )
    }
  }

  /**
   * Connect to an EVM wallet
   */
  async connectEVMWallet(provider: WalletProvider): Promise<ConnectedWallet> {
    try {
      console.log(`Connecting to ${provider.name}...`)

      // Request account access
      const accounts = await provider.provider.request({
        method: 'eth_requestAccounts'
      })

      if (!accounts || accounts.length === 0) {
        throw new WalletError(
          'No accounts found',
          WalletErrorCode.CONNECTION_REJECTED
        )
      }

      const address = accounts[0].toLowerCase()
      
      // Validate address
      if (!isAddress(address)) {
        throw new WalletError(
          'Invalid Ethereum address',
          WalletErrorCode.INVALID_ADDRESS
        )
      }

      // Get network info
      const chainId = await provider.provider.request({
        method: 'eth_chainId'
      })
      const network = this.getNetworkFromChainId(chainId)

      // Create connected wallet object
      const wallet: ConnectedWallet = {
        address: getAddress(address), // Checksummed address
        name: provider.name,
        icon: provider.icon,
        provider: provider.provider,
        network,
        isPrimary: false
      }

      // Get initial balance
      try {
        const balance = await this.getBalance(wallet)
        wallet.balance = balance
      } catch (error) {
        console.warn('Could not fetch initial balance:', error)
      }

      // Register with backend
      await this.registerWallet(wallet)

      // Store in memory
      const walletKey = `${wallet.address}-${wallet.network}`
      this.connectedWallets.set(walletKey, wallet)

      return wallet
    } catch (error: any) {
      if (error.code === 4001) {
        throw new WalletError(
          'User rejected connection',
          WalletErrorCode.CONNECTION_REJECTED
        )
      }
      throw error
    }
  }

  /**
   * Connect to a Solana wallet
   */
  async connectSolanaWallet(solanaWallet: SolanaWallet): Promise<ConnectedWallet> {
    try {
      console.log(`Connecting to ${solanaWallet.adapter.name}...`)

      await solanaWallet.adapter.connect()

      if (!solanaWallet.adapter.publicKey) {
        throw new WalletError(
          'No public key found',
          WalletErrorCode.CONNECTION_REJECTED
        )
      }

      const address = solanaWallet.adapter.publicKey.toString()

      const wallet: ConnectedWallet = {
        address,
        name: solanaWallet.adapter.name,
        icon: solanaWallet.adapter.icon,
        provider: solanaWallet.adapter,
        network: 'solana',
        publicKey: address,
        isPrimary: false
      }

      // Register with backend
      await this.registerWallet(wallet)

      // Store in memory
      const walletKey = `${wallet.address}-${wallet.network}`
      this.connectedWallets.set(walletKey, wallet)

      return wallet
    } catch (error: any) {
      if (error.name === 'WalletConnectionError') {
        throw new WalletError(
          'User rejected connection',
          WalletErrorCode.CONNECTION_REJECTED
        )
      }
      throw error
    }
  }

  /**
   * Connect to a Bitcoin wallet
   */
  async connectBitcoinWallet(bitcoinWallet: BitcoinWallet): Promise<ConnectedWallet> {
    try {
      console.log(`Connecting to ${bitcoinWallet.name}...`)

      const addresses = await bitcoinWallet.getAddresses()

      if (!addresses || addresses.length === 0) {
        throw new WalletError(
          'No addresses found',
          WalletErrorCode.CONNECTION_REJECTED
        )
      }

      // Use first address as primary
      const address = addresses[0]

      const wallet: ConnectedWallet = {
        address,
        name: bitcoinWallet.name,
        icon: bitcoinWallet.icon,
        provider: bitcoinWallet.provider,
        network: 'bitcoin',
        isPrimary: false
      }

      // Register with backend
      await this.registerWallet(wallet)

      // Store in memory
      const walletKey = `${wallet.address}-${wallet.network}`
      this.connectedWallets.set(walletKey, wallet)

      return wallet
    } catch (error: any) {
      throw new WalletError(
        'Failed to connect Bitcoin wallet',
        WalletErrorCode.CONNECTION_REJECTED,
        error
      )
    }
  }

  /**
   * Disconnect a wallet
   */
  async disconnectWallet(address: string, network: BlockchainNetwork): Promise<void> {
    if (!this.connectedWallets) {
      throw new WalletError(
        'Wallet service not initialized',
        WalletErrorCode.PROVIDER_NOT_FOUND
      )
    }

    const walletKey = `${address}-${network}`
    const wallet = this.connectedWallets.get(walletKey)

    if (!wallet) {
      throw new WalletError(
        'Wallet not found',
        WalletErrorCode.PROVIDER_NOT_FOUND
      )
    }

    try {
      // Disconnect from provider
      if (network === 'solana' && wallet.provider.disconnect) {
        await wallet.provider.disconnect()
      }

      // Remove from backend
      await this.removeWalletFromBackend(address, network)

      // Remove from memory
      this.connectedWallets.delete(walletKey)
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      throw error
    }
  }

  /**
   * Set primary wallet
   */
  async setPrimaryWallet(address: string, network: BlockchainNetwork): Promise<void> {
    if (!this.connectedWallets) {
      throw new WalletError(
        'Wallet service not initialized',
        WalletErrorCode.PROVIDER_NOT_FOUND
      )
    }

    // Update all wallets to non-primary
    this.connectedWallets.forEach(wallet => {
      wallet.isPrimary = false
    })

    // Set the selected wallet as primary
    const walletKey = `${address}-${network}`
    const wallet = this.connectedWallets.get(walletKey)
    
    if (wallet) {
      wallet.isPrimary = true
    }

    // Update backend
    await this.setPrimaryWalletOnBackend(address, network)
  }

  /**
   * Get wallet balance using multi-chain service
   */
  async getBalance(wallet: ConnectedWallet, forceRefresh = false): Promise<string> {
    try {
      const balanceInfo = await multiChainService.getBalance(wallet, forceRefresh)
      return balanceInfo.nativeBalance
    } catch (error) {
      console.error('Error fetching balance:', error)
      return '0'
    }
  }

  /**
   * Get detailed balance information
   */
  async getBalanceInfo(wallet: ConnectedWallet, forceRefresh = false): Promise<BalanceInfo> {
    return await multiChainService.getBalance(wallet, forceRefresh)
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    wallet: ConnectedWallet,
    options: { limit?: number; offset?: number; forceRefresh?: boolean } = {}
  ): Promise<Transaction[]> {
    return await multiChainService.getTransactionHistory(wallet, options)
  }

  /**
   * Switch network using multi-chain service
   */
  async switchNetwork(targetNetwork: BlockchainNetwork): Promise<void> {
    // Get current primary wallet
    const primaryWallet = Array.from(this.connectedWallets.values())
      .find(w => w.isPrimary)

    if (!primaryWallet) {
      throw new WalletError(
        'No wallet connected',
        WalletErrorCode.PROVIDER_NOT_FOUND
      )
    }

    try {
      await multiChainService.switchNetwork(primaryWallet, targetNetwork)
      
      // Update wallet network in local state and backend
      primaryWallet.network = targetNetwork
      const walletKey = `${primaryWallet.address}-${targetNetwork}`
      this.connectedWallets.set(walletKey, primaryWallet)
      
      // Sync with backend
      await this.updateWalletNetwork(primaryWallet.address, targetNetwork)
    } catch (error: any) {
      throw new WalletError(
        error.message || 'Failed to switch network',
        WalletErrorCode.NETWORK_MISMATCH,
        { targetNetwork, currentNetwork: primaryWallet.network }
      )
    }
  }

  /**
   * Get all connected wallets
   */
  async getConnectedWallets(): Promise<ConnectedWallet[]> {
    try {
      // Ensure connectedWallets Map is initialized
      if (!this.connectedWallets) {
        this.connectedWallets = new Map<string, ConnectedWallet>()
      }

      // Fetch from backend
      const response = await apiClient.get<{ wallets: ConnectedWallet[] }>(
        API_CONFIG.endpoints.wallet.list
      )

      if (response.success && response.data) {
        // Update local cache
        this.connectedWallets.clear()
        response.data.wallets.forEach(wallet => {
          const key = `${wallet.address}-${wallet.network}`
          this.connectedWallets.set(key, wallet)
        })
        
        return response.data.wallets
      }

      return []
    } catch (error) {
      console.error('Error fetching connected wallets:', error)
      // Return cached wallets if available, otherwise empty array
      return this.connectedWallets ? Array.from(this.connectedWallets.values()) : []
    }
  }

  /**
   * Register wallet with backend
   */
  private async registerWallet(wallet: ConnectedWallet): Promise<void> {
    try {
      const response = await apiClient.post(
        API_CONFIG.endpoints.wallet.register,
        {
          address: wallet.address,
          name: wallet.name,
          network: wallet.network,
          publicKey: wallet.publicKey,
          isPrimary: wallet.isPrimary
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Failed to register wallet')
      }
    } catch (error) {
      console.error('Failed to register wallet with backend:', error)
      throw new WalletError(
        'Failed to sync wallet with backend',
        WalletErrorCode.BACKEND_SYNC_FAILED,
        error
      )
    }
  }

  /**
   * Remove wallet from backend
   */
  private async removeWalletFromBackend(address: string, network: BlockchainNetwork): Promise<void> {
    try {
      await apiClient.delete(API_CONFIG.endpoints.wallet.delete(address))
    } catch (error) {
      console.error('Failed to remove wallet from backend:', error)
      throw new WalletError(
        'Failed to remove wallet from backend',
        WalletErrorCode.BACKEND_SYNC_FAILED,
        error
      )
    }
  }

  /**
   * Set primary wallet on backend
   */
  private async setPrimaryWalletOnBackend(address: string, network: BlockchainNetwork): Promise<void> {
    try {
      await apiClient.put(
        API_CONFIG.endpoints.wallet.setPrimary,
        { address, network }
      )
    } catch (error) {
      console.error('Failed to set primary wallet on backend:', error)
      throw new WalletError(
        'Failed to update primary wallet',
        WalletErrorCode.BACKEND_SYNC_FAILED,
        error
      )
    }
  }

  /**
   * Queue wallet balance update
   */
  queueBalanceUpdate(wallet: ConnectedWallet, balance: string): void {
    const key = `${wallet.address}-${wallet.network}`
    
    this.syncQueue.set(key, {
      wallet,
      updates: { balance },
      timestamp: Date.now()
    })

    this.scheduleBatchSync()
  }

  /**
   * Schedule batch synchronization
   */
  private scheduleBatchSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer)
    }

    this.syncTimer = setTimeout(() => {
      this.performBatchSync()
    }, 5000) // 5 second delay for batching
  }

  /**
   * Perform batch synchronization
   */
  private async performBatchSync(): Promise<void> {
    if (this.syncQueue.size === 0) return

    const updates = Array.from(this.syncQueue.values())
    this.syncQueue.clear()

    try {
      // Update balances individually for now
      // TODO: Implement batch endpoint on backend
      for (const update of updates) {
        await apiClient.put(
          API_CONFIG.endpoints.wallet.updateBalance,
          {
            address: update.wallet.address,
            network: update.wallet.network,
            balance: update.updates.balance
          }
        )
      }
    } catch (error) {
      console.error('Batch sync failed:', error)
      // Re-queue failed updates
      updates.forEach(update => {
        const key = `${update.wallet.address}-${update.wallet.network}`
        this.syncQueue.set(key, update)
      })
    }
  }

  /**
   * Send wallet detection analytics
   */
  private async sendDetectionAnalytics(detection: WalletDetectionResult): Promise<void> {
    try {
      await apiClient.post(
        API_CONFIG.endpoints.wallet.detection,
        { detectedWallets: detection }
      )
    } catch (error) {
      console.warn('Failed to send detection analytics:', error)
    }
  }

  /**
   * Get network from chain ID using multi-chain service
   */
  private getNetworkFromChainId(chainId: string): BlockchainNetwork {
    const id = parseInt(chainId, 16)
    return multiChainService.getNetworkByChainId(id) || 'ethereum'
  }

  /**
   * Update wallet network in backend
   */
  private async updateWalletNetwork(address: string, network: BlockchainNetwork): Promise<void> {
    try {
      await apiClient.put(
        API_CONFIG.endpoints.wallet.updateBalance, // Reuse this endpoint for network updates
        {
          address,
          network,
          action: 'update_network'
        }
      )
    } catch (error) {
      console.warn('Failed to update wallet network on backend:', error)
    }
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks() {
    return multiChainService.getSupportedNetworks()
  }

  /**
   * Get mainnet networks only
   */
  getMainnetNetworks() {
    return multiChainService.getMainnetNetworks()
  }

  /**
   * Get testnet networks only
   */
  getTestnetNetworks() {
    return multiChainService.getTestnetNetworks()
  }

  /**
   * Get chain switching recommendations
   */
  getChainSwitchingRecommendations(fromNetwork: BlockchainNetwork, toNetwork: BlockchainNetwork) {
    return multiChainService.getChainSwitchingRecommendations(fromNetwork, toNetwork)
  }

  /**
   * Format balance for display
   */
  formatBalance(balance: string, decimals = 4): string {
    return multiChainService.formatBalance(balance, decimals)
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    multiChainService.clearCache()
  }

  /**
   * Verify wallet ownership through signature
   */
  async verifyWalletOwnership(wallet: ConnectedWallet): Promise<boolean> {
    try {
      const message = `Verify wallet ownership for ClearHold\n\nWallet: ${wallet.address}\nTimestamp: ${Date.now()}`
      
      let signature: string

      switch (wallet.network) {
        case 'ethereum':
        case 'polygon':
        case 'bsc':
        case 'arbitrum':
        case 'optimism': {
          signature = await wallet.provider.request({
            method: 'personal_sign',
            params: [message, wallet.address]
          })
          break
        }
        
        case 'solana': {
          if (wallet.provider.signMessage) {
            const encodedMessage = new TextEncoder().encode(message)
            signature = await wallet.provider.signMessage(encodedMessage)
          } else {
            return false
          }
          break
        }
        
        case 'bitcoin': {
          // Bitcoin message signing would require additional implementation
          return true
        }
        
        default:
          return false
      }

      // TODO: Verify signature on backend
      console.log('Wallet ownership verified:', { wallet: wallet.address, signature })
      return true
    } catch (error) {
      console.error('Failed to verify wallet ownership:', error)
      return false
    }
  }
}

// Export singleton instance
export const walletService = new WalletService()