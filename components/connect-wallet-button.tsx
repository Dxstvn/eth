"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, ExternalLink, Copy, Check } from "lucide-react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import { useAuth } from "@/context/auth-context"

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
  const { isConnected, isConnecting, address, balance, walletProvider, connectWallet, disconnectWallet } = useWallet()
  const { isDemoAccount } = useAuth()
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showWalletOptions, setShowWalletOptions] = useState(false)

  const handleConnect = async (provider: "metamask" | "coinbase") => {
    try {
      await connectWallet(provider)
      setShowWalletOptions(false)
      addToast({
        title: `${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} Connected`,
        description: "Your wallet has been connected successfully.",
      })
    } catch (error) {
      addToast({
        title: "Connection Failed",
        description: (error as Error).message || "Failed to connect wallet",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    addToast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  const openExplorer = () => {
    if (address) {
      window.open(`https://etherscan.io/address/${address}`, "_blank")
    }
  }

  const formatAddress = (addr: string | null) => {
    if (!addr) return ""
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatEth = (value: string | null) => {
    if (!value) return "0.0"
    return Number.parseFloat(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  }

  if (!isConnected) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={() => setShowWalletOptions(true)}
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

        <Dialog open={showWalletOptions} onOpenChange={setShowWalletOptions}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription>Choose a wallet provider to connect to the application.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-4">
              <Button
                onClick={() => handleConnect("metamask")}
                disabled={isConnecting}
                className="flex items-center justify-center gap-3 h-16 bg-teal-900 hover:bg-teal-800 text-white border border-teal-800"
              >
                <div className="h-8 w-8 relative flex items-center justify-center">
                  <div className="relative w-8 h-8">
                    <MetamaskFox />
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-white">MetaMask</span>
                  <span className="text-xs text-white opacity-80">Connect to your MetaMask wallet</span>
                </div>
              </Button>

              <Button
                onClick={() => handleConnect("coinbase")}
                disabled={isConnecting}
                className="flex items-center justify-center gap-3 h-16 bg-teal-900 hover:bg-teal-800 text-white border border-teal-800"
              >
                <div className="h-8 w-8 relative flex items-center justify-center">
                  <CoinbaseIcon className="h-8 w-8" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-white">Coinbase Wallet</span>
                  <span className="text-xs text-white opacity-80">Connect to your Coinbase wallet</span>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={`connect-wallet-btn ${className}`}>
          <div className="mr-2 h-5 w-5 relative">
            {walletProvider === "metamask" ? (
              <div className="relative w-5 h-5">
                <MetamaskFox />
              </div>
            ) : (
              <div className="h-5 w-5 flex items-center justify-center">
                <CoinbaseIcon className="h-5 w-5" />
              </div>
            )}
          </div>
          <span className="hidden sm:inline mr-1">{formatEth(balance)} ETH</span>
          <span>{formatAddress(address)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-bold">
              Connected to {walletProvider === "metamask" ? "MetaMask" : "Coinbase Wallet"}
            </span>
            <span className="text-xs text-muted-foreground">{formatAddress(address)}</span>
          </div>
        </DropdownMenuLabel>
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
