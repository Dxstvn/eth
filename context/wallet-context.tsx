"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { EIP6963ProviderDetail, ConnectedWallet } from "@/types/wallet"

// Define the shape of our wallet context
type WalletContextType = {
  currentAddress: string | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connectedWallets: ConnectedWallet[]
  discoveredProviders: EIP6963ProviderDetail[]
  connectWallet: (provider: any) => Promise<void>
  disconnectWallet: (address: string) => Promise<void>
  setPrimaryWallet: (address: string) => void
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
  discoveredProviders: [],
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  setPrimaryWallet: () => {},
  getBalance: async () => "0",
  getTransactions: async () => [],
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [discoveredProviders, setDiscoveredProviders] = useState<EIP6963ProviderDetail[]>([])

  // Initialize wallet state from localStorage
  useEffect(() => {
    const savedWallets = localStorage.getItem("connectedWallets")
    if (savedWallets) {
      try {
        const parsedWallets = JSON.parse(savedWallets) as ConnectedWallet[]
        console.log("Loaded wallets from localStorage:", parsedWallets)
        setConnectedWallets(parsedWallets)

        // Set the primary wallet as current
        const primaryWallet = parsedWallets.find((wallet) => wallet.isPrimary)
        if (primaryWallet) {
          setCurrentAddress(primaryWallet.address)
          setIsConnected(true)
        } else if (parsedWallets.length > 0) {
          // If no primary wallet, set the first one as primary
          setCurrentAddress(parsedWallets[0].address)
          setIsConnected(true)

          // Update the first wallet to be primary
          const updatedWallets = parsedWallets.map((wallet, index) => ({
            ...wallet,
            isPrimary: index === 0,
          }))
          setConnectedWallets(updatedWallets)
          localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))
        }
      } catch (err) {
        console.error("Error parsing saved wallets:", err)
      }
    }
  }, [])

  // Listen for EIP-6963 wallet announcements
  useEffect(() => {
    const handleAnnouncement = (event: any) => {
      const providerDetail = event.detail
      console.log("EIP-6963 provider announced:", providerDetail)

      setDiscoveredProviders((prev) => {
        // Check if this provider is already in the list
        const exists = prev.some((p) => p.info.uuid === providerDetail.info.uuid)
        if (exists) return prev
        return [...prev, providerDetail]
      })
    }

    // Listen for wallet announcements
    window.addEventListener("eip6963:announceProvider", handleAnnouncement as EventListener)

    // Request providers to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"))

    // Legacy fallback for window.ethereum
    if (window.ethereum && !discoveredProviders.length) {
      const legacyProvider = {
        info: {
          uuid: "legacy-ethereum",
          name: window.ethereum.isMetaMask
            ? "MetaMask"
            : window.ethereum.isCoinbaseWallet
              ? "Coinbase Wallet"
              : "Injected Wallet",
          icon: "",
          rdns: window.ethereum.isMetaMask
            ? "io.metamask"
            : window.ethereum.isCoinbaseWallet
              ? "com.coinbase.wallet"
              : "unknown",
        },
        provider: window.ethereum,
      }
      setDiscoveredProviders((prev) => [...prev, legacyProvider])
    }

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement as EventListener)
    }
  }, [])

  // Connect wallet function
  const connectWallet = async (provider: any) => {
    try {
      setIsConnecting(true)
      setError(null)

      // Request accounts
      const accounts = await provider.request({
        method: "eth_requestAccounts",
        params: [],
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please make sure your wallet is unlocked.")
      }

      const newAddress = accounts[0]
      console.log("Connected to address:", newAddress)

      // Determine wallet name and icon
      let walletName = "Unknown Wallet"
      let walletIcon = ""

      // Find the provider in discovered providers
      const discoveredProvider = discoveredProviders.find((p) => p.provider === provider)
      if (discoveredProvider) {
        walletName = discoveredProvider.info.name
        walletIcon = discoveredProvider.info.icon
      } else if (provider.isMetaMask) {
        walletName = "MetaMask"
      } else if (provider.isCoinbaseWallet) {
        walletName = "Coinbase Wallet"
      }

      // Check if this wallet is already connected
      const existingWalletIndex = connectedWallets.findIndex(
        (wallet) => wallet.address.toLowerCase() === newAddress.toLowerCase(),
      )

      let updatedWallets: ConnectedWallet[]

      if (existingWalletIndex >= 0) {
        // Update existing wallet
        updatedWallets = [...connectedWallets]
        updatedWallets[existingWalletIndex] = {
          ...updatedWallets[existingWalletIndex],
          name: walletName,
          icon: walletIcon,
          provider: provider,
        }
      } else {
        // Add new wallet
        const newWallet: ConnectedWallet = {
          address: newAddress,
          name: walletName,
          icon: walletIcon,
          provider: provider,
          isPrimary: connectedWallets.length === 0, // First wallet is primary
        }

        updatedWallets = [...connectedWallets, newWallet]
      }

      // Update state
      setConnectedWallets(updatedWallets)
      setCurrentAddress(newAddress)
      setIsConnected(true)

      // Save to localStorage
      localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))

      console.log("Updated connected wallets:", updatedWallets)

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
      // Remove wallet from state
      const updatedWallets = connectedWallets.filter((wallet) => wallet.address.toLowerCase() !== address.toLowerCase())

      // Update state
      setConnectedWallets(updatedWallets)

      // If we disconnected the current address, reset it
      if (currentAddress?.toLowerCase() === address.toLowerCase()) {
        if (updatedWallets.length > 0) {
          // Set another wallet as current if available
          const primaryWallet = updatedWallets.find((wallet) => wallet.isPrimary)
          if (primaryWallet) {
            setCurrentAddress(primaryWallet.address)
          } else {
            // Make the first wallet primary
            const firstWallet = updatedWallets[0]
            const walletsWithPrimary = updatedWallets.map((wallet, index) => ({
              ...wallet,
              isPrimary: index === 0,
            }))
            setConnectedWallets(walletsWithPrimary)
            setCurrentAddress(firstWallet.address)
            localStorage.setItem("connectedWallets", JSON.stringify(walletsWithPrimary))
          }
        } else {
          setCurrentAddress(null)
          setIsConnected(false)
        }
      }

      // Save to localStorage
      localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))

      console.log("Disconnected wallet:", address)
      console.log("Remaining wallets:", updatedWallets)

      return { success: true }
    } catch (err) {
      console.error("Error disconnecting wallet:", err)
      throw err
    }
  }

  // Set primary wallet
  const setPrimaryWallet = (address: string) => {
    const updatedWallets = connectedWallets.map((wallet) => ({
      ...wallet,
      isPrimary: wallet.address.toLowerCase() === address.toLowerCase(),
    }))

    setConnectedWallets(updatedWallets)
    setCurrentAddress(address)

    // Save to localStorage
    localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))

    console.log("Set primary wallet:", address)
    console.log("Updated wallets:", updatedWallets)
  }

  // Get balance using the wallet provider
  const getBalance = async (address: string): Promise<string> => {
    try {
      // Find the wallet with this address
      const wallet = connectedWallets.find((w) => w.address.toLowerCase() === address.toLowerCase())

      if (!wallet || !wallet.provider) {
        throw new Error("Wallet provider not found")
      }

      // Use the wallet's provider to get balance
      const balanceHex = await wallet.provider.request({
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

  // Get transactions using the wallet provider
  const getTransactions = async (address: string): Promise<any[]> => {
    try {
      // In a real implementation, you would use the wallet provider or an API
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
        discoveredProviders,
        connectWallet,
        disconnectWallet,
        setPrimaryWallet,
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
