"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Define the shape of our wallet context
type WalletContextType = {
  address: string | null
  isConnected: boolean
  balance: string
  chainId: number
  walletProvider: "metamask" | "coinbase" | null
  connectWallet: (provider: "metamask" | "coinbase") => Promise<void>
  connectAllWallets: () => Promise<void>
  disconnectWallet: () => void
  isConnecting: boolean
  error: string | null
  setPrimaryWallet: (address: string) => void
  connectedWallets: Array<{
    address: string
    provider: "metamask" | "coinbase"
    isPrimary: boolean
  }>
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  balance: "0",
  chainId: 1,
  walletProvider: null,
  connectWallet: async () => {},
  connectAllWallets: async () => {},
  disconnectWallet: () => {},
  isConnecting: false,
  error: null,
  setPrimaryWallet: () => {},
  connectedWallets: [],
})

// Mock wallet data for development
const MOCK_ADDRESSES = [
  "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF",
  "0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69",
]

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [balance, setBalance] = useState("0")
  const [chainId, setChainId] = useState(1) // Default to Ethereum Mainnet
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletProvider, setWalletProvider] = useState<"metamask" | "coinbase" | null>(null)
  const [connectedWallets, setConnectedWallets] = useState<
    Array<{
      address: string
      provider: "metamask" | "coinbase"
      isPrimary: boolean
    }>
  >([])

  // Check if wallet was previously connected
  useEffect(() => {
    const savedWallets = localStorage.getItem("connectedWallets")

    if (savedWallets) {
      try {
        const wallets = JSON.parse(savedWallets)
        setConnectedWallets(wallets)

        // Find the primary wallet
        const primaryWallet = wallets.find((w: any) => w.isPrimary)
        if (primaryWallet) {
          setAddress(primaryWallet.address)
          setWalletProvider(primaryWallet.provider)
          setIsConnected(true)

          // Set a mock balance
          const mockEthBalance = (Math.random() * 10).toFixed(4)
          setBalance(mockEthBalance)
        }
      } catch (err) {
        console.error("Error parsing saved wallets:", err)
      }
    }
  }, [])

  // Save wallets to localStorage when they change
  useEffect(() => {
    localStorage.setItem("connectedWallets", JSON.stringify(connectedWallets))
  }, [connectedWallets])

  // Function to check if a specific provider is available
  const getProvider = (providerType: "metamask" | "coinbase") => {
    if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
      throw new Error(
        `No wallet providers found. Please install ${providerType === "metamask" ? "MetaMask" : "Coinbase Wallet"}.`,
      )
    }

    // Check if we have multiple providers
    if (window.ethereum.providers?.length) {
      // Find the requested provider
      const requestedProvider = window.ethereum.providers.find(
        (p: any) =>
          (providerType === "metamask" && p.isMetaMask && !p.isCoinbaseWallet) ||
          (providerType === "coinbase" && p.isCoinbaseWallet),
      )

      if (requestedProvider) {
        return requestedProvider
      }

      // If we couldn't find the specific provider in the providers array
      throw new Error(
        `${providerType === "metamask" ? "MetaMask" : "Coinbase Wallet"} is not installed or not available.`,
      )
    }

    // Single provider case
    if (
      (providerType === "metamask" && window.ethereum.isMetaMask && !window.ethereum.isCoinbaseWallet) ||
      (providerType === "coinbase" && window.ethereum.isCoinbaseWallet)
    ) {
      return window.ethereum
    }

    throw new Error(
      `${providerType === "metamask" ? "MetaMask" : "Coinbase Wallet"} is not installed or not available.`,
    )
  }

  // Connect to a specific wallet provider
  const connectWallet = async (providerType: "metamask" | "coinbase") => {
    try {
      setIsConnecting(true)
      setError(null)

      // For demo accounts, use mock data
      if (process.env.NODE_ENV === "development" && !window.ethereum) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Randomly select a mock address
        const randomAddress = MOCK_ADDRESSES[Math.floor(Math.random() * MOCK_ADDRESSES.length)]

        // Generate a random ETH balance between 0.1 and 10
        const mockEthBalance = (Math.random() * 10).toFixed(4)

        // Check if this wallet is already connected
        const existingWallet = connectedWallets.find((w) => w.address === randomAddress)

        if (!existingWallet) {
          // Add the new wallet
          const updatedWallets = [...connectedWallets]
          const isPrimary = updatedWallets.length === 0

          updatedWallets.push({
            address: randomAddress,
            provider: providerType, // Use the explicitly requested provider type
            isPrimary,
          })

          setConnectedWallets(updatedWallets)
        }

        // Update state with the newly connected wallet
        setAddress(randomAddress)
        setBalance(mockEthBalance)
        setIsConnected(true)
        setChainId(1) // Ethereum Mainnet
        setWalletProvider(providerType) // Use the explicitly requested provider type
        return
      }

      // Get the specific provider
      const provider = getProvider(providerType)

      // Request accounts
      const accounts = await provider.request({
        method: "eth_requestAccounts",
        params: [],
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found. Please make sure your wallet is unlocked.")
      }

      const newAddress = accounts[0]

      // Get chain ID
      const chainIdHex = await provider.request({
        method: "eth_chainId",
        params: [],
      })
      const newChainId = Number.parseInt(chainIdHex, 16)

      // Get balance
      const balanceHex = await provider.request({
        method: "eth_getBalance",
        params: [newAddress, "latest"],
      })
      const balanceInWei = Number.parseInt(balanceHex, 16)
      const balanceInEth = balanceInWei / 1e18
      const newBalance = balanceInEth.toFixed(4)

      // Check if this wallet is already connected
      const existingWalletIndex = connectedWallets.findIndex(
        (w) => w.address.toLowerCase() === newAddress.toLowerCase(),
      )

      const updatedWallets = [...connectedWallets]

      if (existingWalletIndex >= 0) {
        // Update the existing wallet's provider to match the explicitly requested type
        updatedWallets[existingWalletIndex] = {
          ...updatedWallets[existingWalletIndex],
          provider: providerType, // Use the explicitly requested provider type
        }
      } else {
        // Add the new wallet
        const isPrimary = updatedWallets.length === 0
        updatedWallets.push({
          address: newAddress,
          provider: providerType, // Use the explicitly requested provider type
          isPrimary,
        })
      }

      setConnectedWallets(updatedWallets)

      // Update state with the newly connected wallet
      setAddress(newAddress)
      setBalance(newBalance)
      setIsConnected(true)
      setChainId(newChainId)
      setWalletProvider(providerType) // Use the explicitly requested provider type
    } catch (err) {
      console.error(`Error connecting ${providerType} wallet:`, err)
      setError(`${(err as Error).message || `Failed to connect ${providerType} wallet. Please try again.`}`)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  // Connect to all available wallets consecutively
  const connectAllWallets = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
        throw new Error("No wallet providers found. Please install MetaMask or Coinbase Wallet.")
      }

      const connectedAddresses = []

      // Try to connect to MetaMask
      try {
        await connectWallet("metamask")
        connectedAddresses.push("metamask")
      } catch (err) {
        console.error("Error connecting to MetaMask:", err)
        // Continue to next wallet even if this one fails
      }

      // Try to connect to Coinbase Wallet
      try {
        await connectWallet("coinbase")
        connectedAddresses.push("coinbase")
      } catch (err) {
        console.error("Error connecting to Coinbase Wallet:", err)
        // Continue even if this one fails
      }

      if (connectedAddresses.length === 0) {
        throw new Error(
          "No wallets could be connected. Please make sure you have MetaMask or Coinbase Wallet installed.",
        )
      }

      return connectedAddresses
    } catch (err) {
      console.error("Error connecting wallets:", err)
      setError(`${(err as Error).message || "Failed to connect wallets. Please try again."}`)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAddress(null)
    setIsConnected(false)
    setBalance("0")
    setWalletProvider(null)

    // Update connected wallets
    const updatedWallets = connectedWallets.filter((w) => w.address !== address)

    // If there are still wallets, set the first one as primary
    if (updatedWallets.length > 0) {
      updatedWallets[0].isPrimary = true
      setConnectedWallets(updatedWallets)

      // Connect to the new primary wallet
      setAddress(updatedWallets[0].address)
      setWalletProvider(updatedWallets[0].provider)
      setIsConnected(true)

      // Set a mock balance
      const mockEthBalance = (Math.random() * 10).toFixed(4)
      setBalance(mockEthBalance)
    } else {
      setConnectedWallets([])
    }
  }

  // Set primary wallet
  const setPrimaryWallet = (walletAddress: string) => {
    const updatedWallets = connectedWallets.map((w) => ({
      ...w,
      isPrimary: w.address === walletAddress,
    }))

    setConnectedWallets(updatedWallets)

    // Connect to the new primary wallet
    const newPrimaryWallet = updatedWallets.find((w) => w.isPrimary)
    if (newPrimaryWallet) {
      setAddress(newPrimaryWallet.address)
      setWalletProvider(newPrimaryWallet.provider)
      setIsConnected(true)

      // Set a mock balance
      const mockEthBalance = (Math.random() * 10).toFixed(4)
      setBalance(mockEthBalance)
    }
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        balance,
        chainId,
        walletProvider,
        connectWallet,
        connectAllWallets,
        disconnectWallet,
        isConnecting,
        error,
        setPrimaryWallet,
        connectedWallets,
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
