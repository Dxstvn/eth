// Mock backend data store - only stores wallet addresses and names
let connectedWallets: Array<{
  address: string
  name: string
}> = []

/**
 * Mock API service for wallet connections
 * This only tracks which wallets are connected, not their balances or transactions
 */
export const walletApi = {
  /**
   * Register a connected wallet with the backend
   */
  async registerWallet(address: string, name: string): Promise<{ success: boolean }> {
    console.log("Registering wallet with backend:", { address, name })

    // Check if wallet already exists
    const existingWalletIndex = connectedWallets.findIndex(
      (wallet) => wallet.address.toLowerCase() === address.toLowerCase(),
    )

    if (existingWalletIndex >= 0) {
      // Update existing wallet
      connectedWallets[existingWalletIndex] = { address, name }
    } else {
      // Add new wallet
      connectedWallets.push({ address, name })
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return { success: true }
  },

  /**
   * Get all connected wallets from the backend
   * This only returns addresses and names, not balances or transactions
   */
  async getConnectedWallets(): Promise<Array<{ address: string; name: string }>> {
    console.log("Fetching connected wallets from backend")

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return [...connectedWallets]
  },

  /**
   * Remove a wallet from the backend
   */
  async removeWallet(address: string): Promise<{ success: boolean }> {
    console.log("Removing wallet from backend:", address)

    connectedWallets = connectedWallets.filter((wallet) => wallet.address.toLowerCase() !== address.toLowerCase())

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300))

    return { success: true }
  },
}
