"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { walletApi } from "@/services/wallet-api"

// Define the shape of our wallet context
type WalletContextType = {
  currentAddress: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connectedWallets: Array<{ address: string; name: string }>
  connectWallet: () => Promise<void>
  disconnectWallet: (address: string) => Promise<void>
  refreshWallets: () => Promise<void>
  getBalance: (address: string) => Promise<string>
  getTransactions: (address: string) => Promise<any[]>
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  currentAddress: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connectedWallets: [],
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  refreshWallets: async () => {},
  getBalance: async () => "0",
  getTransactions: async () => [],
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedWallets, setConnectedWallets] = useState<Array<{ address: string; name: string }>>([])

  // Fetch connected wallets on mount
  useEffect(() => {
    refreshWallets()
  }, [])

  // Function to refresh the list of connected wallets from the backend
  const refreshWallets = async () => {
    try {
      const wallets = await walletApi.getConnectedWallets()
      console.log("Fetched wallets from backend:", wallets)
      setConnectedWallets(wallets)

      // If we have wallets but no current address, set the first one as current
      if (wallets.length > 0 && !currentAddress) {
        setCurrentAddress(wallets[0].address)
        setIsConnected(true)
      } else if (wallets.length === 0) {
        setCurrentAddress(null)
        setIsConnected(false)
      }
    } catch (err) {
      console.error("Error fetching wallets:", err)
    }
  }

  // Connect wallet function - uses window.ethereum directly
  const connectWallet = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      // Check if ethereum is available
      if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
        throw new Error("No wallet provider found. Please install MetaMask or another compatible wallet.")
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please make sure your wallet is unlocked.")
      }

      const newAddress = accounts[0]
      console.log("Connected to address:", newAddress)

      // Determine wallet name
      let walletName = "Unknown Wallet"
      if (window.ethereum.isMetaMask) {
        walletName = "MetaMask"
      } else if (window.ethereum.isCoinbaseWallet) {
        walletName = "Coinbase Wallet"
      }

      // Register wallet with backend
      await walletApi.registerWallet(newAddress, walletName)

      // Refresh wallets from backend
      await refreshWallets()

      // Set current address
      setCurrentAddress(newAddress)
      setIsConnected(true)

      return { address: newAddress, name: walletName }
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError((err as Error).message || "Failed to connect wallet. Please try again.")
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect wallet function
  const disconnectWallet = async (address: string) => {
    try {
      await walletApi.removeWallet(address)

      // Refresh wallets from backend
      await refreshWallets()

      // If we disconnected the current address, reset it
      if (currentAddress === address) {
        if (connectedWallets.length > 0) {
          // Set another wallet as current if available
          const remainingWallets = connectedWallets.filter((w) => w.address !== address)
          if (remainingWallets.length > 0) {
            setCurrentAddress(remainingWallets[0].address)
          } else {
            setCurrentAddress(null)
            setIsConnected(false)
          }
        } else {
          setCurrentAddress(null)
          setIsConnected(false)
        }
      }

      return { success: true }
    } catch (err) {
      console.error("Error disconnecting wallet:", err)
      throw err
    }
  }

  // Get balance using the injection provider
  const getBalance = async (address: string): Promise<string> => {
    try {
      if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
        throw new Error("No wallet provider found")
      }

      // Use the injection provider to get balance
      const balanceHex = await window.ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })

      // Convert from wei to ether
      const balanceInWei = Number.parseInt(balanceHex, 16)
      const balanceInEth = balanceInWei / 1e18
      return balanceInEth.toFixed(4)
    } catch (err) {
      console.error("Error getting balance:", err)

      // For development/demo, return a mock balance
      if (process.env.NODE_ENV === "development") {
        return (Math.random() * 10).toFixed(4)
      }

      return "0"
    }
  }

  // Get transactions using the injection provider
  const getTransactions = async (address: string): Promise<any[]> => {
    try {
      // In a real implementation, you would use the injection provider or an API
      // to fetch transactions for the given address

      // For now, return mock data
      return [
        {
          hash: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10),
          from: address,
          to: "0x" + Math.random().toString(16).substring(2, 42),
          value: (Math.random() * 1).toFixed(4),
          timestamp: Date.now() - Math.floor(Math.random() * 86400000),
          type: "sent",
        },
        {
          hash: "0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10),
          from: "0x" + Math.random().toString(16).substring(2, 42),
          to: address,
          value: (Math.random() * 2).toFixed(4),
          timestamp: Date.now() - Math.floor(Math.random() * 86400000 * 2),
          type: "received",
        },
      ]
    } catch (err) {
      console.error("Error getting transactions:", err)
      return []
    }
  }

  return (
    <WalletContext.Provider
      value={{
        currentAddress,
        isConnected,
        isConnecting,
        error,
        connectedWallets,
        connectWallet,
        disconnectWallet,
        refreshWallets,
        getBalance,
        getTransactions,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

// Custom hook to use the wallet context
export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
