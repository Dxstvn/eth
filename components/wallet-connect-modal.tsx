"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/wallet-context"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import Image from "next/image"

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const { discoveredProviders, connectWallet, isConnecting } = useWallet()
  const { toast } = useToast()
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)

  const handleConnect = async (provider: any, providerName: string) => {
    try {
      setConnectingProvider(providerName)
      await connectWallet(provider)
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: (error as Error).message || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnectingProvider(null)
    }
  }

  // If no providers are discovered, show a message
  if (discoveredProviders.length === 0 && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-center text-sm text-muted-foreground mb-4">
              No wallet providers detected. Please install a wallet extension like MetaMask or Coinbase Wallet.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => window.open("https://metamask.io/download/", "_blank")}
                className="flex items-center gap-2"
              >
                <MetamaskFox className="h-5 w-5" />
                Install MetaMask
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://www.coinbase.com/wallet/downloads", "_blank")}
                className="flex items-center gap-2"
              >
                <CoinbaseIcon className="h-5 w-5" />
                Install Coinbase Wallet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {discoveredProviders.map((provider) => (
            <Button
              key={provider.info.uuid}
              variant="outline"
              className="flex justify-start items-center gap-3 h-14 px-4"
              disabled={isConnecting && connectingProvider === provider.info.name}
              onClick={() => handleConnect(provider.provider, provider.info.name)}
            >
              <div className="h-8 w-8 flex-shrink-0">
                {provider.info.name === "MetaMask" || provider.info.rdns === "io.metamask" ? (
                  <MetamaskFox className="h-8 w-8" />
                ) : provider.info.name === "Coinbase Wallet" || provider.info.rdns === "com.coinbase.wallet" ? (
                  <CoinbaseIcon className="h-8 w-8" />
                ) : provider.info.icon ? (
                  <Image
                    src={provider.info.icon || "/placeholder.svg"}
                    alt={provider.info.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium">{provider.info.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <p className="font-medium">{provider.info.name}</p>
                <p className="text-xs text-muted-foreground">{provider.info.rdns || "Connect to your wallet"}</p>
              </div>
              {isConnecting && connectingProvider === provider.info.name && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
