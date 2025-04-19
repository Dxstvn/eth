"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check, Trash2, Plus, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/context/wallet-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import { useAuth } from "@/context/auth-context"

interface ConnectedWallet {
  provider: "metamask" | "coinbase"
  address: string
  isPrimary: boolean
}

export default function WalletsSettingsPage() {
  const { isConnected, address, walletProvider, connectWallet, disconnectWallet, setPrimaryWallet } = useWallet()
  const { isDemoAccount } = useAuth()
  const { addToast } = useToast()
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])
  const [showAddWalletDialog, setShowAddWalletDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize connected wallets
  useEffect(() => {
    // For demo account, show a demo wallet
    if (isDemoAccount) {
      setConnectedWallets([
        {
          provider: "coinbase",
          address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          isPrimary: true,
        },
      ])
      return
    }

    // For non-demo accounts, load from localStorage if available
    const savedWallets = localStorage.getItem("connectedWallets")
    if (savedWallets) {
      try {
        // Get the wallets from localStorage
        const allWallets = JSON.parse(savedWallets)

        // Get the current user email to use as a key
        const userEmail = localStorage.getItem("current-user-email")

        // If we have wallets for this user, use them
        if (userEmail && allWallets[userEmail]) {
          setConnectedWallets(allWallets[userEmail])
        } else {
          // Otherwise start with an empty array
          setConnectedWallets([])
        }
      } catch (err) {
        console.error("Error parsing saved wallets:", err)
        setConnectedWallets([])
      }
    }

    // Add current wallet if connected and not already in the list
    if (isConnected && address && walletProvider) {
      setConnectedWallets((prev) => {
        // Check if this wallet is already in our list
        if (prev.some((wallet) => wallet.address === address)) {
          return prev // Return unchanged if already exists
        }

        // Only set as primary if there are no other wallets
        const isPrimary = prev.length === 0

        return [
          ...prev,
          {
            provider: walletProvider,
            address,
            isPrimary,
          },
        ]
      })
    }
  }, [isConnected, address, walletProvider, isDemoAccount]) // Remove connectedWallets from dependencies

  // Save wallets to localStorage when they change
  useEffect(() => {
    if (!isDemoAccount && connectedWallets.length >= 0) {
      try {
        // Get the current user email to use as a key
        const userEmail = localStorage.getItem("current-user-email")

        if (userEmail) {
          // Get all wallets from localStorage
          const savedWallets = localStorage.getItem("connectedWallets")
          let allWallets = {}

          if (savedWallets) {
            allWallets = JSON.parse(savedWallets)
          }

          // Update the wallets for this user
          allWallets[userEmail] = connectedWallets

          // Save back to localStorage
          localStorage.setItem("connectedWallets", JSON.stringify(allWallets))
        }
      } catch (err) {
        console.error("Error saving wallets:", err)
      }
    }
  }, [connectedWallets, isDemoAccount])

  const handleAddWallet = async (provider: "metamask" | "coinbase") => {
    try {
      setIsConnecting(true)
      setError(null)

      // Connect the wallet
      await connectWallet(provider)

      // Close the dialog
      setShowAddWalletDialog(false)

      addToast({
        title: "Wallet Connected",
        description: `Your ${provider === "metamask" ? "MetaMask" : "Coinbase"} wallet has been connected successfully.`,
      })
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError(`Failed to connect ${provider} wallet. Please try again.`)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSetPrimary = (address: string) => {
    setPrimaryWallet(address)

    setConnectedWallets((prev) =>
      prev.map((wallet) => ({
        ...wallet,
        isPrimary: wallet.address === address,
      })),
    )

    addToast({
      title: "Primary Wallet Updated",
      description: "Your primary wallet has been updated successfully.",
    })
  }

  const handleRemoveWallet = (address: string) => {
    // Check if this is the primary wallet
    const isRemovingPrimary = connectedWallets.find((w) => w.address === address)?.isPrimary

    // Remove the wallet
    setConnectedWallets((prev) => {
      const filtered = prev.filter((wallet) => wallet.address !== address)

      // If we removed the primary wallet and there are other wallets, set the first one as primary
      if (isRemovingPrimary && filtered.length > 0) {
        filtered[0].isPrimary = true
      }

      return filtered
    })

    // If this is the currently connected wallet, disconnect it
    if (address === address) {
      disconnectWallet()
    }

    addToast({
      title: "Wallet Removed",
      description: "The wallet has been removed successfully.",
    })
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
            <CardDescription>
              Manage your connected wallets. The primary wallet will be used for transactions by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectedWallets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have any wallets connected yet.</p>
                <Button
                  onClick={() => setShowAddWalletDialog(true)}
                  className="bg-teal-900 hover:bg-teal-800 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Connect a Wallet
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connectedWallets.map((wallet) => (
                  <div
                    key={wallet.address}
                    className={`p-4 rounded-lg border ${wallet.isPrimary ? "border-teal-200 bg-teal-50" : "border-gray-200"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 relative flex items-center justify-center">
                          {wallet.provider === "metamask" ? (
                            <div className="relative w-10 h-10">
                              <MetamaskFox />
                            </div>
                          ) : (
                            <div className="h-10 w-10 flex items-center justify-center">
                              <CoinbaseIcon className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {wallet.provider === "metamask" ? "MetaMask" : "Coinbase Wallet"}
                            </p>
                            {wallet.isPrimary && (
                              <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">Primary</span>
                            )}
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
                        {!wallet.isPrimary && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-teal-700 border-teal-200 hover:bg-teal-50"
                            onClick={() => handleSetPrimary(wallet.address)}
                          >
                            <Check className="h-4 w-4 mr-1" /> Set Primary
                          </Button>
                        )}
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
            <Button onClick={() => setShowAddWalletDialog(true)} className="bg-teal-900 hover:bg-teal-800 text-white">
              <Plus className="mr-2 h-4 w-4" /> Connect Another Wallet
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Wallet Management</CardTitle>
            <CardDescription>Understanding how wallets work with CryptoEscrow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Primary Wallet</h3>
              <p className="text-sm text-gray-600">
                Your primary wallet is used by default for all transactions. You can change your primary wallet at any
                time.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Multiple Wallets</h3>
              <p className="text-sm text-gray-600">
                You can connect multiple wallets from different providers. This allows you to use different wallets for
                different transactions.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Wallet Security</h3>
              <p className="text-sm text-gray-600">
                CryptoEscrow never stores your private keys. All transactions are signed directly through your wallet
                provider.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Wallet Dialog */}
      <Dialog open={showAddWalletDialog} onOpenChange={setShowAddWalletDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a Wallet</DialogTitle>
            <DialogDescription>Choose a wallet provider to connect to your account.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button
              onClick={() => handleAddWallet("metamask")}
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
              onClick={() => handleAddWallet("coinbase")}
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
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddWalletDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
