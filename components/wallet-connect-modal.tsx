"use client"

import { useState } from "react"
import { useWallet } from "@/context/wallet-context"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Wallet } from "lucide-react"
import Image from "next/image"

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const { connectWallet, isConnecting, discoveredProviders } = useWallet()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  const handleConnectWallet = async (provider: any) => {
    try {
      setError(null)
      await connectWallet(provider)
      onOpenChange(false)
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      })
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError(`${(err as Error).message || "Failed to connect wallet. Please try again."}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a Wallet</DialogTitle>
          <DialogDescription>Choose a wallet provider to connect to your account.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
          {discoveredProviders.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted-foreground mb-4">No wallet providers detected.</p>
              <p className="text-sm">
                Please install a wallet like{" "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  MetaMask
                </a>{" "}
                or{" "}
                <a
                  href="https://www.coinbase.com/wallet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  Coinbase Wallet
                </a>
              </p>
            </div>
          ) : (
            discoveredProviders.map((providerDetail) => (
              <Button
                key={providerDetail.info.uuid}
                onClick={() => handleConnectWallet(providerDetail.provider)}
                disabled={isConnecting}
                className="flex items-center justify-start gap-3 h-16 bg-teal-900 hover:bg-teal-800 text-white border border-teal-800"
              >
                <div className="h-8 w-8 relative flex items-center justify-center">
                  {providerDetail.info.icon ? (
                    <div className="relative w-8 h-8">
                      <Image
                        src={providerDetail.info.icon || "/placeholder.svg"}
                        alt={providerDetail.info.name}
                        width={32}
                        height={32}
                      />
                    </div>
                  ) : (
                    <Wallet className="h-8 w-8" />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-white">{providerDetail.info.name}</span>
                  <span className="text-xs text-white opacity-80">Connect to your wallet</span>
                </div>
              </Button>
            ))
          )}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
