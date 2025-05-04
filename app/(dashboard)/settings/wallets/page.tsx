"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trash2, Plus, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/context/wallet-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import { Wallet } from "lucide-react"

export default function WalletsSettingsPage() {
  const { connectWallet, disconnectWallet, isConnecting, connectedWallets, refreshWallets } = useWallet()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  // Debug log for connected wallets
  console.log("Wallet Settings Page - Connected Wallets:", connectedWallets)

  const handleAddWallet = async () => {
    try {
      setError(null)
      await connectWallet()
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully.",
      })
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError(`${(err as Error).message || "Failed to connect wallet. Please try again."}`)
    }
  }

  const handleRemoveWallet = async (address: string) => {
    try {
      await disconnectWallet(address)
      toast({
        title: "Wallet Removed",
        description: "The wallet has been removed successfully.",
      })
    } catch (err) {
      console.error("Error removing wallet:", err)
      toast({
        title: "Error",
        description: `Failed to remove wallet: ${(err as Error).message}`,
        variant: "destructive",
      })
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/settings" className="flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Link>
        <h1 className="text-2xl font-bold">Wallet Management</h1>
        <p className="text-gray-500">Connect and manage your cryptocurrency wallets</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connected Wallets</CardTitle>
            <CardDescription>Manage your connected wallets.</CardDescription>
          </CardHeader>
          <CardContent>
            {connectedWallets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have any wallets connected yet.</p>
                <Button onClick={handleAddWallet} className="bg-teal-900 hover:bg-teal-800 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Connect a Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connectedWallets.map((wallet) => (
                  <div key={wallet.address} className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 relative flex items-center justify-center">
                          {wallet.name === "MetaMask" ? (
                            <div className="relative w-10 h-10">
                              <MetamaskFox />
                            </div>
                          ) : wallet.name === "Coinbase Wallet" ? (
                            <div className="h-10 w-10 flex items-center justify-center">
                              <CoinbaseIcon className="h-10 w-10" />
                            </div>
                          ) : (
                            <Wallet className="h-10 w-10" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{wallet.name}</p>
                          </div>
                          <p className="text-sm text-gray-500 font-mono">{formatAddress(wallet.address)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-600"
                          onClick={() => window.open(`https://etherscan.io/address/${wallet.address}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleRemoveWallet(wallet.address)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            {connectedWallets.length > 0 && (
              <Button onClick={handleAddWallet} className="bg-teal-900 hover:bg-teal-800 text-white">
                <Plus className="mr-2 h-4 w-4" /> Connect Another Wallet
              </Button>
            )}
          </CardFooter>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>About Wallet Management</CardTitle>
            <CardDescription>Understanding how wallets work with CryptoEscrow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Wallet Security</h3>
              <p className="text-sm text-gray-600">
                CryptoEscrow never stores your private keys. All transactions are signed directly through your wallet
                provider.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Multiple Wallets</h3>
              <p className="text-sm text-gray-600">
                You can connect multiple wallets from different providers. This allows you to use different wallets for
                different transactions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
