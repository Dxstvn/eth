"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useWallet } from "@/context/wallet-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ExternalLink, RefreshCw, Wallet, Shield, Zap, Info, Network, Globe } from "lucide-react"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import Image from "next/image"
import type { BlockchainNetwork } from "@/types/wallet"

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const { 
    evmProviders, 
    solanaWallets, 
    bitcoinWallets, 
    connectWallet, 
    connectSolanaWallet, 
    connectBitcoinWallet,
    isConnecting,
    refreshWalletDetection 
  } = useWallet()
  const { toast } = useToast()
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("evm")
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetwork>("ethereum")

  const networkOptions: { value: BlockchainNetwork; label: string; icon: string }[] = [
    { value: "ethereum", label: "Ethereum", icon: "🟦" },
    { value: "polygon", label: "Polygon", icon: "🟣" },
    { value: "arbitrum", label: "Arbitrum", icon: "🔵" },
    { value: "optimism", label: "Optimism", icon: "🔴" },
    { value: "base", label: "Base", icon: "🔷" },
  ]

  const handleConnectEVM = async (provider: any, providerName: string) => {
    try {
      setConnectingProvider(providerName)
      await connectWallet(provider, selectedNetwork, providerName)
      toast({
        title: "Wallet Connected Successfully",
        description: `${providerName} connected to ${networkOptions.find(n => n.value === selectedNetwork)?.label}`,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Connection error:", error)
      toast({
        title: "Connection Failed",
        description: (error as Error).message || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleConnectSolana = async (wallet: any, walletName: string) => {
    try {
      setConnectingProvider(walletName)
      await connectSolanaWallet(wallet)
      toast({
        title: "Solana Wallet Connected",
        description: `${walletName} connected successfully`,
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: (error as Error).message || "Failed to connect Solana wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleConnectBitcoin = async (wallet: any, walletName: string) => {
    try {
      setConnectingProvider(walletName)
      await connectBitcoinWallet(wallet)
      toast({
        title: "Bitcoin Wallet Connected",
        description: `${walletName} connected successfully`,
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: (error as Error).message || "Failed to connect Bitcoin wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnectingProvider(null)
    }
  }

  const handleRefreshDetection = async () => {
    await refreshWalletDetection()
    toast({
      title: "Detection Refreshed",
      description: "Scanned for new wallet extensions",
    })
  }

  const getWalletIcon = (name: string, icon?: string) => {
    if (name === "MetaMask" || name.toLowerCase().includes("metamask")) {
      return <MetamaskFox className="h-10 w-10" />
    }
    if (name === "Coinbase Wallet" || name.toLowerCase().includes("coinbase")) {
      return <CoinbaseIcon className="h-10 w-10" />
    }
    if (icon) {
      return (
        <Image
          src={icon}
          alt={name}
          width={40}
          height={40}
          className="rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )
    }
    return (
      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
        <span className="text-lg font-semibold text-teal-700">{name.charAt(0).toUpperCase()}</span>
      </div>
    )
  }

  const totalWallets = evmProviders.length + solanaWallets.length + bitcoinWallets.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-teal-700" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-teal-900">Connect Your Wallet</DialogTitle>
                <DialogDescription className="text-sm text-neutral-600">
                  Choose a wallet to connect and start using ClearHold
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshDetection}
              className="text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {totalWallets > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Found {totalWallets} wallet{totalWallets > 1 ? 's' : ''} installed. Select one below to connect.
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="evm" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              EVM ({evmProviders.length})
            </TabsTrigger>
            <TabsTrigger value="solana" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Solana ({solanaWallets.length})
            </TabsTrigger>
            <TabsTrigger value="bitcoin" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Bitcoin ({bitcoinWallets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evm" className="space-y-4">
            {evmProviders.length > 0 ? (
              <>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-teal-900 mb-3">Select Network</h4>
                    <div className="flex flex-wrap gap-2">
                      {networkOptions.map((network) => (
                        <Button
                          key={network.value}
                          variant={selectedNetwork === network.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedNetwork(network.value)}
                          className={`${
                            selectedNetwork === network.value 
                              ? "bg-teal-900 hover:bg-teal-800 text-white" 
                              : "text-teal-700 border-teal-200 hover:bg-teal-50"
                          }`}
                        >
                          <span className="mr-2">{network.icon}</span>
                          {network.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium text-teal-900 mb-3">Available Wallets</h4>
                    <div className="grid gap-3">
                      {evmProviders.map((provider) => (
                        <Card key={provider.uuid || provider.rdns || provider.name} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {getWalletIcon(provider.name, provider.icon)}
                                <div>
                                  <h5 className="font-medium text-teal-900">{provider.name}</h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {provider.detected ? "Installed" : "Not Detected"}
                                    </Badge>
                                    {provider.detected && (
                                      <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                        Ready
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleConnectEVM(provider.provider, provider.name)}
                                disabled={!provider.detected || connectingProvider === provider.name}
                                className="bg-teal-900 hover:bg-teal-800 text-white"
                              >
                                {connectingProvider === provider.name ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                  </>
                                ) : (
                                  "Connect"
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                  <Wallet className="h-8 w-8 text-neutral-400" />
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">No EVM Wallets Found</h4>
                  <p className="text-sm text-neutral-500 mb-4">
                    Install a wallet extension like MetaMask or Coinbase Wallet to continue.
                  </p>
                  <Button variant="outline" onClick={() => window.open("https://metamask.io", "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Install MetaMask
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="solana" className="space-y-4">
            {solanaWallets.length > 0 ? (
              <div className="grid gap-3">
                {solanaWallets.map((wallet, index) => (
                  <Card key={wallet.adapter.name || `solana-${index}`} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getWalletIcon(wallet.adapter.name, wallet.adapter.icon)}
                          <div>
                            <h5 className="font-medium text-teal-900">{wallet.adapter.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                Solana Network
                              </Badge>
                              <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                Ready
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleConnectSolana(wallet, wallet.adapter.name)}
                          disabled={connectingProvider === wallet.adapter.name}
                          className="bg-teal-900 hover:bg-teal-800 text-white"
                        >
                          {connectingProvider === wallet.adapter.name ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                  <Zap className="h-8 w-8 text-neutral-400" />
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">No Solana Wallets Found</h4>
                  <p className="text-sm text-neutral-500 mb-4">
                    Install a Solana wallet like Phantom or Solflare to continue.
                  </p>
                  <Button variant="outline" onClick={() => window.open("https://phantom.app", "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Install Phantom
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bitcoin" className="space-y-4">
            {bitcoinWallets.length > 0 ? (
              <div className="grid gap-3">
                {bitcoinWallets.map((wallet, index) => (
                  <Card key={wallet.name || `bitcoin-${index}`} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getWalletIcon(wallet.name, wallet.icon)}
                          <div>
                            <h5 className="font-medium text-teal-900">{wallet.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                Bitcoin Network
                              </Badge>
                              <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                                Ready
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleConnectBitcoin(wallet, wallet.name)}
                          disabled={connectingProvider === wallet.name}
                          className="bg-teal-900 hover:bg-teal-800 text-white"
                        >
                          {connectingProvider === wallet.name ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto">
                  <Globe className="h-8 w-8 text-neutral-400" />
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">No Bitcoin Wallets Found</h4>
                  <p className="text-sm text-neutral-500 mb-4">
                    Bitcoin wallet integration coming soon.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure connection via wallet extensions</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefreshDetection}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Detect Wallets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}