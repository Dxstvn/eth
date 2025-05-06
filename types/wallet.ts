// EIP-6963 interfaces
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

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider"
  detail: EIP6963ProviderDetail
}

export interface ConnectedWallet {
  address: string
  name: string
  icon?: string
  provider?: any
  isPrimary?: boolean
}
