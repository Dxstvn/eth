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

  // Connect wallet function
  const connectWallet = async (provider: "metamask" | "coinbase") => {
    try {
      setIsConnecting(true)
      setError(null)

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Randomly select a mock address
      const randomAddress = MOCK_ADDRESSES[Math.floor(Math.random() * MOCK_ADDRESSES.length)]

      // Generate a random ETH balance between 0.1 and 10
      const mockEthBalance = (Math.random() * 10).toFixed(4)

      // Check if this wallet is already connected
      const existingWallet = connectedWallets.find((w) => w.address === randomAddress)

      if (!existingWallet) {
        // Add the new wallet without changing primary status of existing wallets
        const updatedWallets = [...connectedWallets]

        // Only set as primary if there are no other wallets
        const isPrimary = updatedWallets.length === 0

        updatedWallets.push({
          address: randomAddress,
          provider,
          isPrimary,
        })

        setConnectedWallets(updatedWallets)
      }

      // Update state with the newly connected wallet
      setAddress(randomAddress)
      setBalance(mockEthBalance)
      setIsConnected(true)
      setChainId(1) // Ethereum Mainnet
      setWalletProvider(provider)
    } catch (err) {
      console.error(`Error connecting ${provider} wallet:`, err)
      setError(`Failed to connect ${provider} wallet. Please try again.`)
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
