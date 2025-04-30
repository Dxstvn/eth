"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { ExternalLink, Plus, Settings, Check } from "lucide-react"

export default function WalletSettingsPage() {
  const { isConnected, address, walletProvider, connectWallet, connectedWallets, setPrimaryWallet } = useWallet()
  const { toast } = useToast()
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnectWallet = async (provider: "metamask" | "coinbase") => {
    try {
      setIsConnecting(true)
      setError(null)
      await connectWallet(provider)
      setShowConnectDialog(false)
      toast({
        title: "Wallet Connected",
        description: `Your ${provider === "metamask" ? "MetaMask" : "Coinbase"} wallet has been connected successfully.`,
      })
    } catch (err) {
      console.error("Error connecting wallet:", err)
      setError(`${(err as Error).message || `Failed to connect ${provider} wallet. Please try again.`}`)
    } finally {
      setIsConnecting(false)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Wallet Settings</h3>
        <p className="text-sm text-muted-foreground">Manage your cryptocurrency wallet settings</p>
      </div>

      <Tabs defaultValue="connected" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connected">Connected Wallets</TabsTrigger>
          <TabsTrigger value="settings">Transaction Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="connected" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Wallets</CardTitle>
              <CardDescription>Manage your connected cryptocurrency wallets</CardDescription>
            </CardHeader>
            <CardContent>
              {connectedWallets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You don't have any wallets connected yet.</p>
                  <Button
                    onClick={() => setShowConnectDialog(true)}
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
                      className={`p-4 rounded-lg border ${
                        wallet.isPrimary ? "border-teal-200 bg-teal-50" : "border-gray-200"
                      }`}
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
                                <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">
                                  Primary
                                </span>
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
                              onClick={() => setPrimaryWallet(wallet.address)}
                            >
                              <Check className="h-4 w-4 mr-1" /> Set Primary
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {connectedWallets.length === 0 ? (
                <Button onClick={() => setShowConnectDialog(true)} className="bg-teal-900 hover:bg-teal-800 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Connect Wallet
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setShowConnectDialog(true)}
                    className="bg-teal-900 hover:bg-teal-800 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Connect Another Wallet
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/settings/wallets">
                      <Settings className="mr-2 h-4 w-4" /> Manage Wallets
                    </Link>
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Settings</CardTitle>
              <CardDescription>Configure your transaction preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Default Gas Fee</label>
                <select className="w-full mt-1 p-2 border rounded-md">
                  <option value="standard">Standard</option>
                  <option value="fast">Fast</option>
                  <option value="instant">Instant</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Set your preferred gas fee for Ethereum transactions</p>
              </div>
              <div>
                <label className="text-sm font-medium">Transaction Limits</label>
                <input type="number" className="w-full mt-1 p-2 border rounded-md" placeholder="5" defaultValue={5} />
                <p className="text-xs text-gray-500 mt-1">Set daily transaction limits for security</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Require Password for Transactions</p>
                  <p className="text-xs text-gray-500">Add an extra layer of security for transactions</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="absolute h-4 w-4 rounded-full bg-white translate-x-1"></span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-teal-900 hover:bg-teal-800 text-white">Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Wallet Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a Wallet</DialogTitle>
            <DialogDescription>Choose a wallet provider to connect to your account.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button
              onClick={() => handleConnectWallet("metamask")}
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
              onClick={() => handleConnectWallet("coinbase")}
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
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
