import type { BlockchainNetwork } from '@/types/wallet'

interface NetworkInfo {
  chainId: number
  name: string
  network: BlockchainNetwork
  rpcUrl: string
  symbol: string
  blockExplorer: string
}

const NETWORK_CONFIGS: Record<number, NetworkInfo> = {
  1: { chainId: 1, name: 'Ethereum Mainnet', network: 'ethereum', rpcUrl: 'https://mainnet.infura.io/v3/', symbol: 'ETH', blockExplorer: 'https://etherscan.io' },
  137: { chainId: 137, name: 'Polygon Mainnet', network: 'polygon', rpcUrl: 'https://polygon-rpc.com/', symbol: 'MATIC', blockExplorer: 'https://polygonscan.com' },
  56: { chainId: 56, name: 'BSC Mainnet', network: 'bsc', rpcUrl: 'https://bsc-dataseed.binance.org/', symbol: 'BNB', blockExplorer: 'https://bscscan.com' },
  42161: { chainId: 42161, name: 'Arbitrum One', network: 'arbitrum', rpcUrl: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', blockExplorer: 'https://arbiscan.io' },
  10: { chainId: 10, name: 'Optimism', network: 'optimism', rpcUrl: 'https://mainnet.optimism.io', symbol: 'ETH', blockExplorer: 'https://optimistic.etherscan.io' }
}

export class NetworkDetectionService {
  /**
   * Detect current network from connected provider
   */
  async detectCurrentNetwork(provider: any): Promise<BlockchainNetwork | null> {
    try {
      if (!provider) return null
      
      const chainId = await provider.request({ method: 'eth_chainId' })
      const chainIdNumber = parseInt(chainId, 16)
      
      const networkInfo = NETWORK_CONFIGS[chainIdNumber]
      return networkInfo?.network || null
    } catch (error) {
      console.warn('Failed to detect current network:', error)
      return null
    }
  }

  /**
   * Get network info by chain ID
   */
  getNetworkByChainId(chainId: number): BlockchainNetwork | null {
    const networkInfo = NETWORK_CONFIGS[chainId]
    return networkInfo?.network || null
  }

  /**
   * Get chain ID by network
   */
  getChainIdByNetwork(network: BlockchainNetwork): number | null {
    const entry = Object.values(NETWORK_CONFIGS).find(config => config.network === network)
    return entry?.chainId || null
  }

  /**
   * Switch network in wallet provider
   */
  async switchNetwork(provider: any, network: BlockchainNetwork): Promise<boolean> {
    try {
      const chainId = this.getChainIdByNetwork(network)
      if (!chainId || !provider) return false

      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      })

      return true
    } catch (error: any) {
      // If network not added to wallet, try to add it
      if (error.code === 4902) {
        return await this.addNetwork(provider, network)
      }
      
      console.error('Failed to switch network:', error)
      return false
    }
  }

  /**
   * Add network to wallet provider
   */
  async addNetwork(provider: any, network: BlockchainNetwork): Promise<boolean> {
    try {
      const chainId = this.getChainIdByNetwork(network)
      const networkInfo = Object.values(NETWORK_CONFIGS).find(config => config.network === network)
      
      if (!chainId || !networkInfo || !provider) return false

      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${chainId.toString(16)}`,
          chainName: networkInfo.name,
          rpcUrls: [networkInfo.rpcUrl],
          nativeCurrency: {
            name: networkInfo.symbol,
            symbol: networkInfo.symbol,
            decimals: 18
          },
          blockExplorerUrls: [networkInfo.blockExplorer]
        }]
      })

      return true
    } catch (error) {
      console.error('Failed to add network:', error)
      return false
    }
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks(): NetworkInfo[] {
    return Object.values(NETWORK_CONFIGS)
  }

  /**
   * Check if network is supported
   */
  isNetworkSupported(chainId: number): boolean {
    return chainId in NETWORK_CONFIGS
  }
}

export const networkDetectionService = new NetworkDetectionService() 