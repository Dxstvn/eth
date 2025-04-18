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
    const savedAddress = localStorage.getItem("walletAddress")
    const savedProvider = localStorage.getItem("walletProvider") as "metamask" | "coinbase" | null
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
    } else if (savedAddress && savedProvider) {
      setAddress(savedAddress)
      setIsConnected(true)
      setWalletProvider(savedProvider)

      // Set a mock balance
      const mockEthBalance = (Math.random() * 10).toFixed(4)
      setBalance(mockEthBalance)

      // Initialize connected wallets with this wallet
      setConnectedWallets([
        {
          address: savedAddress,
          provider: savedProvider,
          isPrimary: true,
        },
      ])
    }
  }, [])

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

      if (existingWallet) {
        // If it's already connected, just set it as primary
        const updatedWallets = connectedWallets.map((w) => ({
          ...w,
          isPrimary: w.address === randomAddress,
        }))

        setConnectedWallets(updatedWallets)
        localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))
      } else {
        // Add the new wallet
        const updatedWallets = connectedWallets.map((w) => ({
          ...w,
          isPrimary: false,
        }))

        updatedWallets.push({
          address: randomAddress,
          provider,
          isPrimary: true,
        })

        setConnectedWallets(updatedWallets)
        localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))
      }

      // Update state
      setAddress(randomAddress)
      setBalance(mockEthBalance)
      setIsConnected(true)
      setChainId(1) // Ethereum Mainnet
      setWalletProvider(provider)

      // Save to localStorage
      localStorage.setItem("walletAddress", randomAddress)
      localStorage.setItem("walletProvider", provider)

      console.log(`${provider} wallet connected:`, randomAddress)
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

      // Update localStorage
      localStorage.setItem("walletAddress", updatedWallets[0].address)
      localStorage.setItem("walletProvider", updatedWallets[0].provider)
    } else {
      setConnectedWallets([])
      localStorage.removeItem("walletAddress")
      localStorage.removeItem("walletProvider")
    }

    localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))
    console.log("Wallet disconnected")
  }

  // Set primary wallet
  const setPrimaryWallet = (walletAddress: string) => {
    const wallet = connectedWallets.find((w) => w.address === walletAddress)

    if (wallet) {
      // Update connected wallets
      const updatedWallets = connectedWallets.map((w) => ({
        ...w,
        isPrimary: w.address === walletAddress,
      }))

      setConnectedWallets(updatedWallets)

      // Connect to the new primary wallet
      setAddress(wallet.address)
      setWalletProvider(wallet.provider)
      setIsConnected(true)

      // Set a mock balance
      const mockEthBalance = (Math.random() * 10).toFixed(4)
      setBalance(mockEthBalance)

      // Update localStorage
      localStorage.setItem("walletAddress", wallet.address)
      localStorage.setItem("walletProvider", wallet.provider)
      localStorage.setItem("connectedWallets", JSON.stringify(updatedWallets))
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
