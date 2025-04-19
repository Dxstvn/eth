"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { useDatabaseStore } from "@/lib/mock-database"
import { useWallet } from "@/context/wallet-context"
import { useToast } from "@/components/ui/use-toast"
import { MetamaskFox } from "@/components/icons/metamask-fox"
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
import { useAuth } from "@/context/auth-context"

export default function WalletPage() {
  const { getAssets, getActivities } = useDatabaseStore()
  const { address, isConnected, balance, connectWallet, isConnecting, error, walletProvider, connectedWallets } =
    useWallet()
  const { isDemoAccount } = useAuth()
  const { addToast } = useToast()
  const [assets, setAssets] = useState(getAssets())
  const [activities, setActivities] = useState(
    getActivities().filter((a) => a.type === "payment_sent" || a.type === "payment_received"),
  )
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [activeTab, setActiveTab] = useState("assets")
  const [checkingIpfs, setCheckingIpfs] = useState(false)

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Update assets with small random changes
    const updatedAssets = assets.map((asset) => {
      const changePercent = (Math.random() * 2 - 1) * 2 // Random between -2% and +2%
      const newPrice = Number.parseFloat(asset.price.replace("$", "")) * (1 + changePercent / 100)
      const newValue = asset.amount * newPrice
      const newChange = `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`

      return {
        ...asset,
        price: `${newPrice.toFixed(2)}`,
        value: newValue,
        change: newChange,
        trend: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "neutral",
      }
    })

    setAssets(updatedAssets)
    setRefreshing(false)
  }

  // Handle copy address
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      addToast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  // Handle view on explorer
  const handleViewOnExplorer = () => {
    if (address) {
      window.open(`https://etherscan.io/address/${address}`, "_blank")
    }
  }

  // Add this function to handle wallet connection with provider parameter
  const handleConnectWallet = async (provider: "metamask" | "coinbase") => {
    try {
      setCheckingIpfs(true) // Reuse the existing loading state
      await connectWallet(provider)
      addToast({
        title: `${provider === "metamask" ? "MetaMask" : "Coinbase Wallet"} Connected`,
        description: "Your wallet has been connected successfully.",
      })
    } catch (err) {
      addToast({
        title: "Connection Failed",
        description: error || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCheckingIpfs(false)
    }
  }

  // Calculate total balance
  const totalBalance = assets.reduce((sum, asset) => sum + asset.value, 0)

  // If not connected, show wallet connection UI
  if (!isConnected) {
    return (
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-teal-900 font-display">Connect Your Wallet</h1>
              <p className="text-neutral-600">Connect your wallet to manage your cryptocurrency</p>
            </div>
          </div>
        </div>

        <Card className="shadow-md border-0 max-w-2xl mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Choose a Wallet Provider</CardTitle>
            <CardDescription>Connect your wallet to view your balance and transaction history</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["metamask", "coinbase"].map((provider) => (
                <Button
                  key={provider}
                  onClick={() => handleConnectWallet(provider as "metamask" | "coinbase")}
                  disabled={isConnecting}
                  className="flex items-center justify-center gap-3 h-32 bg-teal-900 hover:bg-teal-800 text-white border border-teal-800"
                >
                  <div className="h-12 w-12 relative flex items-center justify-center">
                    {provider === "metamask" ? (
                      <div className="relative w-10 h-10">
                        <MetamaskFox />
                      </div>
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center">
                        <CoinbaseIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-white">
                      {provider === "metamask" ? "MetaMask" : "Coinbase Wallet"}
                    </span>
                    <span className="text-xs text-white opacity-80">
                      {provider === "metamask" ? "Popular Ethereum Wallet" : "Coinbase's Crypto Wallet"}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-teal-900 font-display">Wallet</h1>
            <p className="text-neutral-600">Manage your cryptocurrency assets and transactions</p>
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
                <>
                  <span className="animate-spin mr-2">⟳</span> Refreshing...
                </>
              ) : (
                <>⟳ Refresh</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAddress}
              className="text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              {copiedAddress ? "✓ Copied" : "Copy Address"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewOnExplorer}
              className="text-teal-700 border-teal-200 hover:bg-teal-50"
            >
              View on Explorer
            </Button>
          </div>
        </div>
      </div>

      <Card className="shadow-md border-0">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Update the connected wallet display */}
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-800">
                {walletProvider === "metamask" ? (
                  <div className="relative w-12 h-12">
                    <MetamaskFox />
                  </div>
                ) : (
                  <div className="h-10 w-10 flex items-center justify-center">
                    <CoinbaseIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-teal-900 font-display">
                  {walletProvider === "metamask" ? "MetaMask" : "Coinbase Wallet"}
                </h2>
                <p className="text-sm text-neutral-500 font-mono">
                  {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ""}
                </p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-neutral-500">Total Balance</p>
              <p className="text-3xl font-bold text-teal-900 font-display">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8" aria-label="Wallet tabs">
          <button
            className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              activeTab === "assets"
                ? "border-teal-900 text-teal-900"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
            onClick={() => setActiveTab("assets")}
          >
            Assets
          </button>
          <button
            className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "border-teal-900 text-teal-900"
                : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
            }`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
        </nav>
      </div>

      {activeTab === "assets" && (
        <div className="space-y-4">
          {loading
            ? // Loading skeleton for assets
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-white border border-neutral-100 rounded-lg p-5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                        <div>
                          <div className="h-5 bg-neutral-200 rounded w-24 mb-1"></div>
                          <div className="h-4 bg-neutral-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 bg-neutral-200 rounded w-20 mb-1"></div>
                        <div className="h-4 bg-neutral-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))
            : assets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white border border-neutral-100 rounded-lg p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          asset.symbol === "BTC"
                            ? "bg-amber-100 text-amber-700"
                            : asset.symbol === "ETH"
                              ? "bg-blue-100 text-blue-700"
                              : asset.symbol === "USDC"
                                ? "bg-teal-100 text-teal-700"
                                : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {asset.symbol.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-teal-900">{asset.name}</p>
                        <p className="text-sm text-neutral-500">
                          {asset.amount} {asset.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-teal-900">
                        ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p
                        className={`text-sm ${
                          asset.trend === "up"
                            ? "text-green-600"
                            : asset.trend === "down"
                              ? "text-red-600"
                              : "text-neutral-500"
                        }`}
                      >
                        {asset.change}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-4">
          {loading
            ? // Loading skeleton for activity
              Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="bg-white border border-neutral-100 rounded-lg p-5 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                        <div>
                          <div className="h-5 bg-neutral-200 rounded w-32 mb-1"></div>
                          <div className="h-4 bg-neutral-200 rounded w-48"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="h-5 bg-neutral-200 rounded w-20 mb-1"></div>
                        <div className="h-4 bg-neutral-200 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))
            : activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white border border-neutral-100 rounded-lg p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === "payment_sent" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        }`}
                      >
                        {activity.type === "payment_sent" ? "↑" : "↓"}
                      </div>
                      <div>
                        <p className="font-medium text-teal-900">{activity.title}</p>
                        <p className="text-sm text-neutral-500">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-teal-900">{new Date(activity.date).toLocaleDateString()}</p>
                      <p className="text-sm text-neutral-500">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  )
}
