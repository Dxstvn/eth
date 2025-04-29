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

  // Connect to a specific wallet provider
  const connectWallet = async (provider: "metamask" | "coinbase") => {
    try {
      setIsConnecting(true)
      setError(null)

      if (typeof window === "undefined" || typeof window.ethereum === "undefined") {
        throw new Error(`${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} is not installed`)
      }

      let ethereumProvider = window.ethereum

      // Handle case where multiple providers exist
      if (window.ethereum.providers?.length) {
        // Find the requested provider
        const requestedProvider = window.ethereum.providers.find(
          (p: any) => (provider === "metamask" && p.isMetaMask) || (provider === "coinbase" && p.isCoinbaseWallet),
        )

        if (requestedProvider) {
          ethereumProvider = requestedProvider
        } else {
          throw new Error(`${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} is not installed`)
        }
      } else {
        // Check if the single provider matches the requested one
        if (
          (provider === "metamask" && !window.ethereum.isMetaMask) ||
          (provider === "coinbase" && !window.ethereum.isCoinbaseWallet)
        ) {
          throw new Error(`${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} is not installed`)
        }
      }

      // Request accounts
      const accounts = await ethereumProvider.request({
        method: "eth_requestAccounts",
        params: [],
      })

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const newAddress = accounts[0]

      // Get chain ID
      const chainIdHex = await ethereumProvider.request({
        method: "eth_chainId",
        params: [],
      })
      const newChainId = Number.parseInt(chainIdHex, 16)

      // Get balance
      const balanceHex = await ethereumProvider.request({
        method: "eth_getBalance",
        params: [newAddress, "latest"],
      })
      const balanceInWei = Number.parseInt(balanceHex, 16)
      const balanceInEth = balanceInWei / 1e18
      const newBalance = balanceInEth.toFixed(4)

      // Check if this wallet is already connected
      const existingWallet = connectedWallets.find((w) => w.address.toLowerCase() === newAddress.toLowerCase())

      if (!existingWallet) {
        // Add the new wallet without changing primary status of existing wallets
        const updatedWallets = [...connectedWallets]

        // Only set as primary if there are no other wallets
        const isPrimary = updatedWallets.length === 0

        updatedWallets.push({
          address: newAddress,
          provider,
          isPrimary,
        })

        setConnectedWallets(updatedWallets)
      }

      // Update state with the newly connected wallet
      setAddress(newAddress)
      setBalance(newBalance)
      setIsConnected(true)
      setChainId(newChainId)
      setWalletProvider(provider)

      return newAddress
    } catch (err) {
      console.error(`Error connecting ${provider} wallet:`, err)
      setError(`Failed to connect ${provider} wallet: ${(err as Error).message}`)
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
        throw new Error("No wallet providers found")
      }

      const connectedAddresses = []

      // Check if we have multiple providers
      if (window.ethereum.providers?.length) {
        // Connect to MetaMask if available
        const metamaskProvider = window.ethereum.providers.find((p: any) => p.isMetaMask)
        if (metamaskProvider) {
          try {
            const address = await connectWallet("metamask")
            if (address) connectedAddresses.push({ provider: "metamask", address })
          } catch (err) {
            console.error("Error connecting to MetaMask:", err)
            // Continue to next wallet even if this one fails
          }
        }

        // Connect to Coinbase Wallet if available
        const coinbaseProvider = window.ethereum.providers.find((p: any) => p.isCoinbaseWallet)
        if (coinbaseProvider) {
          try {
            const address = await connectWallet("coinbase")
            if (address) connectedAddresses.push({ provider: "coinbase", address })
          } catch (err) {
            console.error("Error connecting to Coinbase Wallet:", err)
            // Continue even if this one fails
          }
        }
      } else {
        // Single provider case
        if (window.ethereum.isMetaMask) {
          try {
            const address = await connectWallet("metamask")
            if (address) connectedAddresses.push({ provider: "metamask", address })
          } catch (err) {
            console.error("Error connecting to MetaMask:", err)
          }
        } else if (window.ethereum.isCoinbaseWallet) {
          try {
            const address = await connectWallet("coinbase")
            if (address) connectedAddresses.push({ provider: "coinbase", address })
          } catch (err) {
            console.error("Error connecting to Coinbase Wallet:", err)
          }
        }
      }

      if (connectedAddresses.length === 0) {
        throw new Error("No wallets could be connected")
      }

      return connectedAddresses
    } catch (err) {
      console.error("Error connecting wallets:", err)
      setError(`Failed to connect wallets: ${(err as Error).message}`)
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
