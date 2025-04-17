"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, ExternalLink, Copy, Check } from "lucide-react"
import { useWalletStore, formatAddress, formatEth, getNetworkInfo } from "@/lib/mock-wallet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

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
  const { isConnected, isConnecting, address, balance, connect, disconnect } = useWalletStore()
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    try {
      await connect()
      addToast({
        title: "Wallet Connected",
        description: "Your MetaMask wallet has been connected successfully.",
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
    disconnect()
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
      const networkInfo = getNetworkInfo(1) // Assuming Ethereum Mainnet
      if (networkInfo) {
        window.open(`${networkInfo.explorer}/address/${address}`, "_blank")
      }
    }
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
              <Image src="/stylized-fox-profile.png" alt="MetaMask" width={20} height={20} />
            </div>
            Connect MetaMask
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
            <Image src="/stylized-fox-profile.png" alt="MetaMask" width={20} height={20} />
          </div>
          <span className="hidden sm:inline mr-1">{formatEth(balance)} ETH</span>
          <span>{formatAddress(address)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-bold">Connected to MetaMask</span>
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
