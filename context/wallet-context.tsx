"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Define the shape of our wallet context
type WalletContextType = {
  address: string | null
  isConnected: boolean
  balance: string
  chainId: number
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isConnecting: boolean
  error: string | null
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  balance: "0",
  chainId: 1,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnecting: false,
  error: null,
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

  // Check if wallet was previously connected
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress")
    if (savedAddress) {
      setAddress(savedAddress)
      setIsConnected(true)

      // Set a mock balance
      const mockEthBalance = (Math.random() * 10).toFixed(4)
      setBalance(mockEthBalance)
    }
  }, [])

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Randomly select a mock address
      const randomAddress = MOCK_ADDRESSES[Math.floor(Math.random() * MOCK_ADDRESSES.length)]

      // Generate a random ETH balance between 0.1 and 10
      const mockEthBalance = (Math.random() * 10).toFixed(4)

      // Update state
      setAddress(randomAddress)
      setBalance(mockEthBalance)
      setIsConnected(true)
      setChainId(1) // Ethereum Mainnet

      // Save to localStorage
      localStorage.setItem("walletAddress", randomAddress)

      console.log("Wallet connected:", randomAddress)
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError("Failed to connect wallet. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect wallet function
  const disconnectWallet = () => {
    setAddress(null)
    setIsConnected(false)
    setBalance("0")
    localStorage.removeItem("walletAddress")
    console.log("Wallet disconnected")
  }

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        balance,
        chainId,
        connectWallet,
        disconnectWallet,
        isConnecting,
        error,
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
