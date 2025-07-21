import { apiClient } from '@/services/api'
import { API_CONFIG, SUPPORTED_NETWORKS, getChainId } from '@/services/api-config'
import type { BlockchainNetwork, ConnectedWallet } from '@/types/wallet'
import { ethers } from 'ethers'

// Enhanced network configuration with additional metadata
export interface NetworkConfig {
  chainId: number
  name: string
  symbol: string
  decimals: number
  rpcUrls: string[]
  blockExplorerUrls: string[]
  iconUrl?: string
  isTestnet?: boolean
  parentChain?: string
  bridgeUrl?: string
}

export const ENHANCED_NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      'https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}',
      'https://cloudflare-eth.com'
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrl: 'https://ethereum.org/static/6b935ac0e6194247347855dc3d328e83/6ed5f/eth-diamond-black.webp'
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://sepolia.infura.io/v3/${INFURA_API_KEY}',
      'https://eth-sepolia.alchemyapi.io/v2/${ALCHEMY_API_KEY}'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    isTestnet: true,
    parentChain: 'ethereum'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}',
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network'
    ],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrl: 'https://wallet-asset.matic.network/img/tokens/matic.svg',
    bridgeUrl: 'https://wallet.polygon.technology/polygon/bridge'
  },
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://rpc-amoy.polygon.technology',
      'https://polygon-amoy.infura.io/v3/${INFURA_API_KEY}'
    ],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
    isTestnet: true,
    parentChain: 'polygon'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}',
      'https://arb1.arbitrum.io/rpc'
    ],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrl: 'https://bridge.arbitrum.io/logo.png',
    parentChain: 'ethereum',
    bridgeUrl: 'https://bridge.arbitrum.io'
  },
  'arbitrum-sepolia': {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://arbitrum-sepolia.infura.io/v3/${INFURA_API_KEY}',
      'https://sepolia-rollup.arbitrum.io/rpc'
    ],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
    isTestnet: true,
    parentChain: 'arbitrum'
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://optimism-mainnet.infura.io/v3/${INFURA_API_KEY}',
      'https://mainnet.optimism.io'
    ],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    iconUrl: 'https://ethereum-optimism.github.io/optimism-logo.svg',
    parentChain: 'ethereum',
    bridgeUrl: 'https://app.optimism.io/bridge'
  },
  base: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base-mainnet.infura.io/v3/${INFURA_API_KEY}'
    ],
    blockExplorerUrls: ['https://basescan.org'],
    iconUrl: 'https://bridge.base.org/icons/base.svg',
    parentChain: 'ethereum',
    bridgeUrl: 'https://bridge.base.org'
  }
}

// Transaction history interface
export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: number
  blockNumber: number
  gasUsed?: string
  gasPrice?: string
  status: 'success' | 'failed' | 'pending'
  type: 'sent' | 'received' | 'contract'
  network: BlockchainNetwork
  tokenSymbol?: string
  tokenAddress?: string
}

// Balance information interface
export interface BalanceInfo {
  address: string
  network: BlockchainNetwork
  nativeBalance: string
  nativeSymbol: string
  lastUpdated: number
  tokens?: Array<{
    address: string
    symbol: string
    balance: string
    decimals: number
    name?: string
    logoUri?: string
  }>
}

/**
 * Multi-chain service for handling cross-chain operations
 */
export class MultiChainService {
  private providers: Map<BlockchainNetwork, ethers.providers.JsonRpcProvider> = new Map()
  private balanceCache: Map<string, BalanceInfo> = new Map()
  private transactionCache: Map<string, Transaction[]> = new Map()

  /**
   * Get network configuration
   */
  getNetworkConfig(network: BlockchainNetwork): NetworkConfig | null {
    return ENHANCED_NETWORKS[network] || null
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks(): NetworkConfig[] {
    return Object.values(ENHANCED_NETWORKS)
  }

  /**
   * Get mainnet networks only
   */
  getMainnetNetworks(): NetworkConfig[] {
    return Object.values(ENHANCED_NETWORKS).filter(network => !network.isTestnet)
  }

  /**
   * Get testnet networks only
   */
  getTestnetNetworks(): NetworkConfig[] {
    return Object.values(ENHANCED_NETWORKS).filter(network => network.isTestnet)
  }

  /**
   * Switch wallet to a different network
   */
  async switchNetwork(wallet: ConnectedWallet, targetNetwork: BlockchainNetwork): Promise<void> {
    if (!this.isEVMNetwork(wallet.network) || !this.isEVMNetwork(targetNetwork)) {
      throw new Error('Network switching only supported for EVM-compatible networks')
    }

    const networkConfig = this.getNetworkConfig(targetNetwork)
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${targetNetwork}`)
    }

    const chainIdHex = `0x${networkConfig.chainId.toString(16)}`

    try {
      // Try to switch to the network
      await wallet.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      })
    } catch (error: any) {
      // If the network doesn't exist in the wallet, add it
      if (error.code === 4902) {
        await this.addNetworkToWallet(wallet, targetNetwork)
        // Try switching again after adding
        await wallet.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }]
        })
      } else {
        throw error
      }
    }
  }

  /**
   * Add a network to the user's wallet
   */
  async addNetworkToWallet(wallet: ConnectedWallet, network: BlockchainNetwork): Promise<void> {
    const networkConfig = this.getNetworkConfig(network)
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`)
    }

    const chainIdHex = `0x${networkConfig.chainId.toString(16)}`

    await wallet.provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: chainIdHex,
        chainName: networkConfig.name,
        nativeCurrency: {
          name: networkConfig.symbol,
          symbol: networkConfig.symbol,
          decimals: networkConfig.decimals
        },
        rpcUrls: networkConfig.rpcUrls.filter(url => !url.includes('${')) // Filter out template URLs
          .slice(0, 1), // Use only the first non-template URL
        blockExplorerUrls: networkConfig.blockExplorerUrls,
        iconUrls: networkConfig.iconUrl ? [networkConfig.iconUrl] : undefined
      }]
    })
  }

  /**
   * Get balance for a wallet on a specific network
   */
  async getBalance(wallet: ConnectedWallet, forceRefresh = false): Promise<BalanceInfo> {
    const cacheKey = `${wallet.address}-${wallet.network}`
    
    // Return cached result if available and not forcing refresh
    if (!forceRefresh && this.balanceCache.has(cacheKey)) {
      const cached = this.balanceCache.get(cacheKey)!
      const now = Date.now()
      // Cache valid for 30 seconds
      if (now - cached.lastUpdated < 30000) {
        return cached
      }
    }

    let balanceInfo: BalanceInfo

    if (this.isEVMNetwork(wallet.network)) {
      balanceInfo = await this.getEVMBalance(wallet)
    } else if (wallet.network === 'solana') {
      balanceInfo = await this.getSolanaBalance(wallet)
    } else if (wallet.network === 'bitcoin') {
      balanceInfo = await this.getBitcoinBalance(wallet)
    } else {
      throw new Error(`Unsupported network: ${wallet.network}`)
    }

    // Cache the result
    this.balanceCache.set(cacheKey, balanceInfo)
    return balanceInfo
  }

  /**
   * Get EVM network balance
   */
  private async getEVMBalance(wallet: ConnectedWallet): Promise<BalanceInfo> {
    try {
      const provider = this.getProvider(wallet.network)
      const balance = await provider.getBalance(wallet.address)
      const networkConfig = this.getNetworkConfig(wallet.network)!

      return {
        address: wallet.address,
        network: wallet.network,
        nativeBalance: ethers.utils.formatEther(balance),
        nativeSymbol: networkConfig.symbol,
        lastUpdated: Date.now()
      }
    } catch (error) {
      console.error('Error fetching EVM balance:', error)
      // Fallback to wallet provider if available
      if (wallet.provider) {
        try {
          const balanceHex = await wallet.provider.request({
            method: 'eth_getBalance',
            params: [wallet.address, 'latest']
          })
          const networkConfig = this.getNetworkConfig(wallet.network)!
          
          return {
            address: wallet.address,
            network: wallet.network,
            nativeBalance: ethers.utils.formatEther(balanceHex),
            nativeSymbol: networkConfig.symbol,
            lastUpdated: Date.now()
          }
        } catch (fallbackError) {
          console.error('Fallback balance fetch failed:', fallbackError)
        }
      }

      // Return zero balance if all methods fail
      const networkConfig = this.getNetworkConfig(wallet.network)!
      return {
        address: wallet.address,
        network: wallet.network,
        nativeBalance: '0',
        nativeSymbol: networkConfig.symbol,
        lastUpdated: Date.now()
      }
    }
  }

  /**
   * Get Solana network balance (placeholder)
   */
  private async getSolanaBalance(wallet: ConnectedWallet): Promise<BalanceInfo> {
    // TODO: Implement Solana balance fetching using @solana/web3.js
    return {
      address: wallet.address,
      network: wallet.network,
      nativeBalance: '0',
      nativeSymbol: 'SOL',
      lastUpdated: Date.now()
    }
  }

  /**
   * Get Bitcoin network balance (placeholder)
   */
  private async getBitcoinBalance(wallet: ConnectedWallet): Promise<BalanceInfo> {
    // TODO: Implement Bitcoin balance fetching using blockchain API
    return {
      address: wallet.address,
      network: wallet.network,
      nativeBalance: '0',
      nativeSymbol: 'BTC',
      lastUpdated: Date.now()
    }
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    wallet: ConnectedWallet, 
    options: {
      limit?: number
      offset?: number
      forceRefresh?: boolean
    } = {}
  ): Promise<Transaction[]> {
    const { limit = 20, offset = 0, forceRefresh = false } = options
    const cacheKey = `${wallet.address}-${wallet.network}`

    // Return cached result if available
    if (!forceRefresh && this.transactionCache.has(cacheKey)) {
      const cached = this.transactionCache.get(cacheKey)!
      return cached.slice(offset, offset + limit)
    }

    let transactions: Transaction[]

    if (this.isEVMNetwork(wallet.network)) {
      transactions = await this.getEVMTransactionHistory(wallet, limit)
    } else if (wallet.network === 'solana') {
      transactions = await this.getSolanaTransactionHistory(wallet, limit)
    } else if (wallet.network === 'bitcoin') {
      transactions = await this.getBitcoinTransactionHistory(wallet, limit)
    } else {
      throw new Error(`Unsupported network: ${wallet.network}`)
    }

    // Cache the result
    this.transactionCache.set(cacheKey, transactions)
    return transactions.slice(offset, offset + limit)
  }

  /**
   * Get EVM transaction history
   */
  private async getEVMTransactionHistory(wallet: ConnectedWallet, limit: number): Promise<Transaction[]> {
    // TODO: Implement using etherscan API or similar
    // For now, return mock data
    return this.generateMockTransactions(wallet, limit)
  }

  /**
   * Get Solana transaction history
   */
  private async getSolanaTransactionHistory(wallet: ConnectedWallet, limit: number): Promise<Transaction[]> {
    // TODO: Implement using Solana RPC API
    return this.generateMockTransactions(wallet, limit)
  }

  /**
   * Get Bitcoin transaction history
   */
  private async getBitcoinTransactionHistory(wallet: ConnectedWallet, limit: number): Promise<Transaction[]> {
    // TODO: Implement using Bitcoin blockchain API
    return this.generateMockTransactions(wallet, limit)
  }

  /**
   * Generate mock transactions for development
   */
  private generateMockTransactions(wallet: ConnectedWallet, count: number): Transaction[] {
    const transactions: Transaction[] = []
    const networkConfig = this.getNetworkConfig(wallet.network)
    
    for (let i = 0; i < count; i++) {
      const isReceived = Math.random() > 0.5
      const value = (Math.random() * 5).toFixed(6)
      const timestamp = Date.now() - (i * 86400000) // Each transaction 1 day apart
      
      transactions.push({
        hash: '0x' + Math.random().toString(16).substring(2, 66), // 64 char hex
        from: isReceived ? '0x' + Math.random().toString(16).substring(2, 42) : wallet.address,
        to: isReceived ? wallet.address : '0x' + Math.random().toString(16).substring(2, 42),
        value,
        timestamp,
        blockNumber: 18000000 + Math.floor(Math.random() * 1000000),
        gasUsed: Math.floor(Math.random() * 100000).toString(),
        gasPrice: (Math.random() * 50).toFixed(9),
        status: Math.random() > 0.05 ? 'success' : 'failed',
        type: isReceived ? 'received' : 'sent',
        network: wallet.network,
        tokenSymbol: networkConfig?.symbol || 'ETH'
      })
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get provider for a network
   */
  private getProvider(network: BlockchainNetwork): ethers.providers.JsonRpcProvider {
    if (!this.providers.has(network)) {
      const networkConfig = this.getNetworkConfig(network)
      if (!networkConfig) {
        throw new Error(`Unsupported network: ${network}`)
      }

      // Use the first available RPC URL (excluding template URLs)
      const rpcUrl = networkConfig.rpcUrls.find(url => !url.includes('${'))
      if (!rpcUrl) {
        throw new Error(`No available RPC URL for network: ${network}`)
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      this.providers.set(network, provider)
    }

    return this.providers.get(network)!
  }

  /**
   * Check if a network is EVM-compatible
   */
  private isEVMNetwork(network: BlockchainNetwork): boolean {
    return ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'sepolia', 'polygon-amoy', 'arbitrum-sepolia'].includes(network)
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.balanceCache.clear()
    this.transactionCache.clear()
  }

  /**
   * Get chain switching recommendations
   */
  getChainSwitchingRecommendations(fromNetwork: BlockchainNetwork, toNetwork: BlockchainNetwork): {
    needsBridge: boolean
    bridgeUrl?: string
    estimatedTime?: string
    estimatedCost?: string
  } {
    const fromConfig = this.getNetworkConfig(fromNetwork)
    const toConfig = this.getNetworkConfig(toNetwork)

    if (!fromConfig || !toConfig) {
      return { needsBridge: false }
    }

    // Check if networks share the same parent chain
    const sameParentChain = fromConfig.parentChain === toConfig.parentChain ||
                           fromNetwork === toConfig.parentChain ||
                           toNetwork === fromConfig.parentChain

    if (sameParentChain) {
      return {
        needsBridge: true,
        bridgeUrl: toConfig.bridgeUrl,
        estimatedTime: '5-15 minutes',
        estimatedCost: 'Low'
      }
    }

    return {
      needsBridge: true,
      estimatedTime: '15-60 minutes',
      estimatedCost: 'Medium-High'
    }
  }

  /**
   * Get network by chain ID
   */
  getNetworkByChainId(chainId: number): BlockchainNetwork | null {
    for (const [network, config] of Object.entries(ENHANCED_NETWORKS)) {
      if (config.chainId === chainId) {
        return network as BlockchainNetwork
      }
    }
    return null
  }

  /**
   * Format balance for display
   */
  formatBalance(balance: string, decimals = 4): string {
    const num = parseFloat(balance)
    if (num === 0) return '0'
    if (num < 0.0001) return '< 0.0001'
    return num.toFixed(decimals)
  }
}

// Export singleton instance
export const multiChainService = new MultiChainService()