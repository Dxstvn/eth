"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useWallet } from "@/context/wallet-context"
import { useToast } from "@/components/ui/use-toast"
import { Wallet, RefreshCw, Copy, ExternalLink, Star, Settings, Plus, Network, TrendingUp, Eye, EyeOff, ChevronRight, Info, CreditCard, Activity, DollarSign } from "lucide-react"
import { NetworkSelector } from "@/components/wallet/network-selector"
import { WalletBalanceCard } from "@/components/wallet/wallet-balance-card"
import { TransactionHistory } from "@/components/wallet/transaction-history"
import WalletConnectModal from "@/components/wallet-connect-modal"
import Image from "next/image"
import type { ConnectedWallet } from "@/types/wallet"

export default function WalletPage() {
  const { 
    currentAddress, 
    isConnected, 
    connectedWallets, 
    getBalance, 
    getTransactions,
    setPrimaryWallet,
    switchNetwork,
    currentNetwork,
    refreshWalletDetection
  } = useWallet()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("overview")
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [balancePrivacy, setBalancePrivacy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, string>>({})
  const [totalPortfolioValue, setTotalPortfolioValue] = useState("0")

  // Get primary wallet
  const primaryWallet = connectedWallets.find(w => w.isPrimary) || connectedWallets[0]

  // Fetch balances for all wallets
  useEffect(() => {
    const fetchAllBalances = async () => {
      if (connectedWallets.length === 0) return

      const balances: Record<string, string> = {}
      let totalValue = 0

      for (const wallet of connectedWallets) {
        try {
          const balance = await getBalance(wallet.address)
          balances[`${wallet.address}-${wallet.network}`] = balance
          
          // Mock price calculation (in real app, fetch from price API)
          const ethPrice = 2000 // Mock ETH price
          const balanceValue = parseFloat(balance) * ethPrice
          totalValue += balanceValue
        } catch (error) {
          console.error(`Error fetching balance for ${wallet.address}:`, error)
          balances[`${wallet.address}-${wallet.network}`] = "0"
        }
      }

      setWalletBalances(balances)
      setTotalPortfolioValue(totalValue.toFixed(2))
    }

    if (isConnected) {
      fetchAllBalances()
    }
  }, [connectedWallets, isConnected, getBalance])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshWalletDetection()
      // Refetch balances
      const balances: Record<string, string> = {}
      for (const wallet of connectedWallets) {
        try {
          const balance = await getBalance(wallet.address)
          balances[`${wallet.address}-${wallet.network}`] = balance
        } catch (error) {
          balances[`${wallet.address}-${wallet.network}`] = "0"
        }
      }
      setWalletBalances(balances)
      toast({
        title: "Refreshed Successfully",
        description: "Wallet data has been updated",
      })
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh wallet data",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard",
    })
  }

  const handleSetPrimaryWallet = async (wallet: ConnectedWallet) => {
    try {
      await setPrimaryWallet(wallet.address, wallet.network)
      toast({
        title: "Primary Wallet Updated",
        description: `${wallet.name} is now your primary wallet`,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to set primary wallet",
        variant: "destructive"
      })
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'ethereum': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'polygon': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'arbitrum': return 'bg-cyan-100 text-cyan-700 border-cyan-200'
      case 'optimism': return 'bg-red-100 text-red-700 border-red-200'
      case 'base': return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (!isConnected) {
    return (
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-teal-900 font-display">Wallet Dashboard</h1>
            <p className="text-neutral-600 mt-2">Connect your wallet to manage your cryptocurrency portfolio</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-10 w-10 text-teal-700" />
              </div>
              <CardTitle className="text-2xl text-teal-900">Connect Your First Wallet</CardTitle>
              <CardDescription className="text-lg">
                Get started by connecting your cryptocurrency wallet to ClearHold
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                    <Network className="h-6 w-6 text-blue-700" />
                  </div>
                  <h4 className="font-medium text-teal-900">Multi-Chain Support</h4>
                  <p className="text-sm text-neutral-500">Ethereum, Polygon, Arbitrum & more</p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6 text-green-700" />
                  </div>
                  <h4 className="font-medium text-teal-900">Portfolio Tracking</h4>
                  <p className="text-sm text-neutral-500">Real-time balance updates</p>
                </div>
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                    <Activity className="h-6 w-6 text-purple-700" />
                  </div>
                  <h4 className="font-medium text-teal-900">Transaction History</h4>
                  <p className="text-sm text-neutral-500">Complete activity tracking</p>
                </div>
              </div>

              <Separator />
              
              <div className="text-center">
                <Button
                  onClick={() => setShowConnectModal(true)}
                  size="lg"
                  className="bg-teal-900 hover:bg-teal-800 text-white px-8 py-3"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Connect Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <WalletConnectModal open={showConnectModal} onOpenChange={setShowConnectModal} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-teal-900 font-display">Wallet Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            Manage your {connectedWallets.length} connected wallet{connectedWallets.length > 1 ? 's' : ''} across multiple networks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-teal-700 border-teal-200 hover:bg-teal-50"
          >
            {refreshing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setShowConnectModal(true)}
            className="text-teal-700 border-teal-200 hover:bg-teal-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Wallet
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBalancePrivacy(!balancePrivacy)}
            className="text-teal-700 border-teal-200 hover:bg-teal-50"
          >
            {balancePrivacy ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Total Portfolio Value</p>
                <p className="text-2xl font-bold text-teal-900">
                  {balancePrivacy ? '••••••' : `$${totalPortfolioValue}`}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Connected Wallets</p>
                <p className="text-2xl font-bold text-teal-900">{connectedWallets.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Active Networks</p>
                <p className="text-2xl font-bold text-teal-900">
                  {new Set(connectedWallets.map(w => w.network)).size}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Network className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Network Selector */}
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network Selection
                </CardTitle>
                <CardDescription>
                  Switch between different blockchain networks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NetworkSelector variant="detailed" />
              </CardContent>
            </Card>

            {/* Primary Wallet Balance */}
            {primaryWallet && (
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-teal-900 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    Primary Wallet
                  </h3>
                  <Badge variant="outline" className={getNetworkColor(primaryWallet.network)}>
                    {primaryWallet.network.charAt(0).toUpperCase() + primaryWallet.network.slice(1)}
                  </Badge>
                </div>
                <WalletBalanceCard wallet={primaryWallet} showActions={true} />
              </div>
            )}
          </div>

          {/* All Wallets Quick View */}
          {connectedWallets.length > 1 && (
            <Card className="shadow-md border-0">
              <CardHeader>
                <CardTitle>All Connected Wallets</CardTitle>
                <CardDescription>Quick overview of all your wallets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {connectedWallets.map((wallet, index) => (
                    <WalletBalanceCard 
                      key={index} 
                      wallet={wallet} 
                      compact={true}
                      showActions={false}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="wallets" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-teal-900">Manage Wallets</h2>
              <p className="text-neutral-600">Set primary wallet and manage connections</p>
            </div>
            <Button onClick={() => setShowConnectModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Wallet
            </Button>
          </div>

          <div className="grid gap-4">
            {connectedWallets.map((wallet, index) => (
              <Card key={index} className="shadow-md border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                        {wallet.icon ? (
                          <Image
                            src={wallet.icon}
                            alt={wallet.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <Wallet className="h-6 w-6 text-teal-700" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-teal-900">{wallet.name}</h3>
                          {wallet.isPrimary && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              Primary
                            </Badge>
                          )}
                          <Badge variant="outline" className={getNetworkColor(wallet.network)}>
                            {wallet.network.charAt(0).toUpperCase() + wallet.network.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-500 font-mono">
                          {formatAddress(wallet.address)}
                        </p>
                        <p className="text-sm font-medium text-teal-900">
                          Balance: {balancePrivacy ? '••••••' : `${walletBalances[`${wallet.address}-${wallet.network}`] || '0'} ETH`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!wallet.isPrimary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimaryWallet(wallet)}
                          className="text-teal-700 border-teal-200 hover:bg-teal-50"
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyAddress(wallet.address)}
                        className="text-teal-700 border-teal-200 hover:bg-teal-50"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/address/${wallet.address}`, '_blank')}
                        className="text-teal-700 border-teal-200 hover:bg-teal-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {primaryWallet ? (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-teal-900 mb-2">Transaction History</h2>
                <p className="text-neutral-600">Recent transactions from your primary wallet</p>
              </div>
              <TransactionHistory wallet={primaryWallet} limit={20} />
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Primary Wallet</h3>
              <p className="text-neutral-500">Set a primary wallet to view transaction history</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Wallet Settings
              </CardTitle>
              <CardDescription>
                Configure your wallet preferences and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-teal-900">Balance Privacy</h4>
                    <p className="text-sm text-neutral-500">Hide wallet balances from view</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBalancePrivacy(!balancePrivacy)}
                    className={balancePrivacy ? "text-green-700 border-green-200" : "text-neutral-700 border-neutral-200"}
                  >
                    {balancePrivacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-teal-900">Network Preferences</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'].map((network) => (
                      <Badge key={network} variant="outline" className={getNetworkColor(network)}>
                        {network.charAt(0).toUpperCase() + network.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-teal-900 mb-3">Connected Wallets Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Total Wallets:</span>
                      <span className="font-medium">{connectedWallets.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Networks:</span>
                      <span className="font-medium">{new Set(connectedWallets.map(w => w.network)).size}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Primary Wallet:</span>
                      <span className="font-medium">{primaryWallet?.name || 'None set'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WalletConnectModal open={showConnectModal} onOpenChange={setShowConnectModal} />
    </div>
  )
}