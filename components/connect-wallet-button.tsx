"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, ExternalLink, Copy, Check, Wallet, AlertCircle } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import { useAuth } from "@/context/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ConnectWalletButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "primary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

// Update the component to properly display the wallet provider icon
export default function ConnectWalletButton({
  variant = "primary",
  size = "default",
  className = "",
}: ConnectWalletButtonProps) {
  const {
    isConnected,
    isConnecting,
    address,
    balance,
    walletProvider,
    connectWallet,
    connectAllWallets,
    disconnectWallet,
    connectedWallets,
    setPrimaryWallet,
    error: walletError,
  } = useWallet()
  const { isDemoAccount } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showWalletOptions, setShowWalletOptions] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Debug log for connected wallets
  console.log("Connect Wallet Button - Connected Wallets:", connectedWallets)

  // Find the primary wallet for accurate provider display
  const primaryWallet = connectedWallets.find((wallet) => wallet.isPrimary)
  const currentProvider = primaryWallet?.provider || walletProvider

  const handleConnect = async (provider: "metamask" | "coinbase") => {
    try {
      setConnectionError(null)
      await connectWallet(provider)
      setShowWalletOptions(false)
      toast({
        title: `${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} Connected`,
        description: "Your wallet has been connected successfully.",
      })
    } catch (error) {
      setConnectionError((error as Error).message || `Failed to connect ${provider} wallet. Please try again.`)
      // Keep the dialog open so user can see the error
    }
  }

  const handleConnectAll = async () => {
    try {
      setConnectionError(null)
      const connectedAddresses = await connectAllWallets()
      setShowWalletOptions(false)
      toast({
        title: "Wallets Connected",
        description: `Successfully connected wallet(s).`,
      })
    } catch (error) {
      setConnectionError((error as Error).message || "Failed to connect wallets. Please try again.")
      // Keep the dialog open so user can see the error
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
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
          onClick={() => {
            setShowWalletOptions(true)
            setConnectionError(null)
          }}
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

        <Dialog
          open={showWalletOptions}
          onOpenChange={(open) => {
            setShowWalletOptions(open)
            if (!open) setConnectionError(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Wallet</DialogTitle>
              <DialogDescription>Choose a wallet provider to connect to the application.</DialogDescription>
            </DialogHeader>

            {connectionError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{connectionError}</AlertDescription>
              </Alert>
            )}

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

              <Button
                onClick={handleConnectAll}
                disabled={isConnecting}
                className="flex items-center justify-center gap-3 h-16 bg-teal-700 hover:bg-teal-600 text-white border border-teal-600"
              >
                <div className="h-8 w-8 relative flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-white">Connect All Wallets</span>
                  <span className="text-xs text-white opacity-80">Connect to all available wallets</span>
                </div>
              </Button>
            </div>
            <DialogFooter className="sm:justify-start">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWalletOptions(false)
                  setConnectionError(null)
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
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
            {currentProvider === "metamask" ? (
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
            <span className="font-bold">
              Connected to {currentProvider === "metamask" ? "MetaMask" : "Coinbase Wallet"}
            </span>
            <span className="text-xs text-muted-foreground">{formatAddress(address)}</span>
          </div>
        </DropdownMenuLabel>

        {connectedWallets.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Other Connected Wallets</DropdownMenuLabel>
            {connectedWallets
              .filter((wallet) => wallet.address !== address)
              .map((wallet) => (
                <DropdownMenuItem
                  key={wallet.address}
                  onClick={() => {
                    setPrimaryWallet(wallet.address)
                    toast({
                      title: "Primary Wallet Changed",
                      description: `Switched to ${wallet.provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} wallet.`,
                    })
                  }}
                >
                  <div className="mr-2 h-4 w-4">
                    {wallet.provider === "metamask" ? (
                      <div className="relative w-4 h-4">
                        <MetamaskFox />
                      </div>
                    ) : (
                      <div className="h-4 w-4 flex items-center justify-center">
                        <CoinbaseIcon className="h-4 w-4" />
                      </div>
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
