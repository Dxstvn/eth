"use client"

import { useWallet } from "@/context/wallet-context"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, LogOut } from "lucide-react"
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function WalletInfo() {
  const { address, balance, disconnectWallet } = useWallet()
  const [copied, setCopied] = useState(false)

  if (!address) return null

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  // Copy address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 bg-teal-50 rounded-lg p-2 border border-teal-100">
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-teal-900">{formatAddress(address)}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={copyAddress} className="text-teal-600 hover:text-teal-800">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy address"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`https://etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>View on Etherscan</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-xs text-teal-700">{balance} ETH</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={disconnectWallet}
        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
