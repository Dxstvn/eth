export interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: any
}

export interface ConnectedWallet {
  address: string
  name: string
  icon?: string
  provider: any
  isPrimary?: boolean
}

// Extend the global Window interface
declare global {
  interface Window {
    ethereum?: any
  }
}
