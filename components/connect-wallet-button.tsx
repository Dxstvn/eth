"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, ExternalLink, Copy, Check, Wallet } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"

interface ConnectWalletButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "primary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export default function ConnectWalletButton({
  variant = "primary",
  size = "default",
  className = "",
}: ConnectWalletButtonProps) {
  const { currentAddress, isConnected, isConnecting, connectWallet, disconnectWallet, connectedWallets, getBalance } =
    useWallet()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [balance, setBalance] = useState("0")

  // Find the current wallet
  const currentWallet = connectedWallets.find((wallet) => wallet.address === currentAddress)

  // Fetch balance when address changes
  useEffect(() => {
    if (currentAddress) {
      fetchBalance()
    }
  }, [currentAddress])

  // Fetch balance from injection provider
  const fetchBalance = async () => {
    if (!currentAddress) return

    try {
      const walletBalance = await getBalance(currentAddress)
      setBalance(walletBalance)
    } catch (error) {
      console.error("Error fetching balance:", error)
    }
  }

  const handleConnect = async () => {
    try {
      await connectWallet()
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: (error as Error).message || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async () => {
    if (!currentAddress) return

    try {
      await disconnectWallet(currentAddress)
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected.",
      })
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: (error as Error).message || "Failed to disconnect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  const copyAddress = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  const openExplorer = () => {
    if (currentAddress) {
      window.open(`https://etherscan.io/address/${currentAddress}`, "_blank")
    }
  }

  const formatAddress = (addr: string | null) => {
    if (!addr) return ""
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleConnect}
        disabled={isConnecting}
        className={`connect-wallet-btn flex items-center ${className}`}
      >
        {isConnecting ? (
          <>
            <span className="animate-pulse mr-2">●</span> Connecting...
          </>
        ) : (
          <>
            <div className="mr-2 h-5 w-5 relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            Connect Wallet
          </>
        )}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={`connect-wallet-btn ${className}`}>
          <div className="mr-2 h-5 w-5 relative">
            {currentWallet?.name === "MetaMask" ? (
              <div className="relative w-5 h-5">
                <MetamaskFox />
              </div>
            ) : currentWallet?.name === "Coinbase Wallet" ? (
              <div className="h-5 w-5 flex items-center justify-center">
                <CoinbaseIcon className="h-5 w-5" />
              </div>
            ) : (
              <Wallet className="h-5 w-5" />
            )}
          </div>
          <span className="hidden sm:inline mr-1">{balance} ETH</span>
          <span>{formatAddress(currentAddress)}</span>
          {connectedWallets.length > 1 && (
            <span className="ml-1 text-xs bg-teal-100 text-teal-800 rounded-full px-1.5 py-0.5">
              +{connectedWallets.length - 1}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-bold">Connected to {currentWallet?.name || "Wallet"}</span>
            <span className="text-xs text-muted-foreground">{formatAddress(currentAddress)}</span>
          </div>
        </DropdownMenuLabel>

        {connectedWallets.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Other Connected Wallets</DropdownMenuLabel>
            {connectedWallets
              .filter((wallet) => wallet.address !== currentAddress)
              .map((wallet) => (
                <DropdownMenuItem key={wallet.address}>
                  <div className="mr-2 h-4 w-4">
                    {wallet.name === "MetaMask" ? (
                      <div className="relative w-4 h-4">
                        <MetamaskFox />
                      </div>
                    ) : wallet.name === "Coinbase Wallet" ? (
                      <div className="h-4 w-4 flex items-center justify-center">
                        <CoinbaseIcon className="h-4 w-4" />
                      </div>
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </div>
                  <span>{formatAddress(wallet.address)}</span>
                </DropdownMenuItem>
              ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          <span>Copy Address</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openExplorer}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>View on Explorer</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
