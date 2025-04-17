"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ArrowRight,
  Copy,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  WalletIcon,
  AlertCircle,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useDatabaseStore } from "@/lib/mock-database"
import { useWallet } from "@/context/wallet-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

export default function WalletPage() {
  const { getAssets, getActivities } = useDatabaseStore()
  const { address, isConnected, balance, connectWallet, isConnecting, error } = useWallet()
  const { addToast } = useToast()
  const [assets, setAssets] = useState(getAssets())
  const [activities, setActivities] = useState(
    getActivities().filter((a) => a.type === "payment_sent" || a.type === "payment_received"),
  )
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [activeTab, setActiveTab] = useState("assets")

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
        price: `$${newPrice.toFixed(2)}`,
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

  // Handle connect wallet
  const handleConnectWallet = async () => {
    try {
      await connectWallet()
      addToast({
        title: "Wallet Connected",
        description: "Your MetaMask wallet has been connected successfully.",
      })
    } catch (err) {
      addToast({
        title: "Connection Failed",
        description: error || "Failed to connect wallet. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Calculate total balance
  const totalBalance = assets.reduce((sum, asset) => sum + asset.value, 0)

  // If not connected, show MetaMask connection UI
  if (!isConnected) {
    return (
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-teal-900 font-display">Connect Your Wallet</h1>
              <p className="text-neutral-600">Connect your MetaMask wallet to manage your cryptocurrency</p>
            </div>
          </div>
        </div>

        <Card className="shadow-md border-0 max-w-2xl mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Connect to MetaMask</CardTitle>
            <CardDescription>Connect your MetaMask wallet to view your balance and transaction history</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="mb-8 w-24 h-24 relative">
              <Image src="/stylized-fox-profile.png" alt="MetaMask Logo" width={96} height={96} />
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6 max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 w-full max-w-md">
              <p className="text-center text-neutral-600">
                MetaMask is a browser extension that allows you to securely manage your Ethereum and other
                cryptocurrency accounts.
              </p>

              <Button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className="w-full bg-teal-900 hover:bg-teal-800 text-white"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Connecting...
                  </>
                ) : (
                  <>
                    <WalletIcon className="mr-2 h-5 w-5" /> Connect to MetaMask
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-neutral-500">
                By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
              </p>
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
            <p className="text-neutral-600">Manage your cryptocurrency wallet and transactions</p>
          </div>
          <div>
            <Button
              variant="outline"
              className="rounded-md px-6 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200">
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
      </div>

      {activeTab === "assets" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Balance Card with Gradient */}
              <Card className="overflow-hidden shadow-md border-0 h-full">
                <div className="bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white h-full flex flex-col">
                  <div>
                    <p className="text-sm text-teal-100 font-medium">Total Balance</p>
                    <p className="text-4xl font-bold mt-1 font-display">
                      ${loading ? "..." : totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="mt-auto pt-6 flex justify-between items-center">
                    <p className="text-sm text-teal-100">+12.5% this month</p>
                  </div>
                </div>
              </Card>

              {/* Bitcoin Card */}
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border-0 h-full">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-semibold mr-2">
                      B
                    </div>
                    <p className="text-lg font-medium text-teal-900">Bitcoin</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-3xl font-bold text-teal-900 font-display">
                      {loading ? "..." : assets[0]?.amount.toFixed(2)} BTC
                    </p>
                    <p className="text-neutral-500">{loading ? "..." : assets[0]?.price}</p>
                  </div>
                  <p className="text-sm text-green-600 mt-auto pt-4 font-medium">
                    {loading ? "..." : assets[0]?.change} today
                  </p>
                </CardContent>
              </Card>

              {/* Ethereum Card */}
              <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border-0 h-full">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-semibold mr-2">
                      E
                    </div>
                    <p className="text-lg font-medium text-teal-900">Ethereum</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-3xl font-bold text-teal-900 font-display">
                      {loading ? "..." : assets[1]?.amount.toFixed(1)} ETH
                    </p>
                    <p className="text-neutral-500">{loading ? "..." : assets[1]?.price}</p>
                  </div>
                  <p className="text-sm text-green-600 mt-auto pt-4 font-medium">
                    {loading ? "..." : assets[1]?.change} today
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction History */}
            <Card className="shadow-md border-0">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-teal-900 font-display">Transaction History</h2>
                <p className="text-sm text-neutral-500">Recent wallet transactions</p>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {loading
                    ? // Loading skeleton
                      Array(4)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gray-200 mr-4"></div>
                              <div>
                                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                                <div className="h-3 w-32 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                              <div className="h-3 w-20 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        ))
                    : // Actual transactions
                      activities
                        .slice(0, 4)
                        .map((activity, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-10 h-10 rounded-full ${
                                  activity.type === "payment_sent"
                                    ? "bg-green-50 text-green-600"
                                    : "bg-teal-50 text-teal-600"
                                } flex items-center justify-center mr-4`}
                              >
                                {activity.type === "payment_sent" ? (
                                  <ArrowUpRight className="h-5 w-5" />
                                ) : (
                                  <ArrowDownRight className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-teal-900">{activity.title}</p>
                                <p className="text-xs text-neutral-500">
                                  {activity.description.split(" to ")[1] || activity.description.split(" from ")[1]}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-teal-900">
                                {activity.type === "payment_sent" ? "-" : "+"}
                                {activity.description.split(" ")[2]} {activity.description.split(" ")[3]}
                              </p>
                              <p className="text-xs text-neutral-500">{activity.date}</p>
                            </div>
                          </div>
                        ))}
                </div>
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full text-teal-700 hover:bg-teal-50 hover:text-teal-800 border-teal-200"
                  >
                    View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Wallet Address Card */}
            <Card className="shadow-md border-0">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-teal-900 font-display">Wallet Address</h2>
                <p className="text-sm text-neutral-500">Your MetaMask wallet address</p>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center bg-neutral-50 p-3 rounded-lg">
                  <code className="text-sm flex-1 overflow-x-auto font-mono text-teal-900">{address}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 text-neutral-500 hover:text-teal-700"
                    onClick={handleCopyAddress}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {copiedAddress && <p className="text-sm text-green-600 text-center">Address copied to clipboard!</p>}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-teal-700 hover:bg-teal-50 hover:text-teal-800 border-teal-200"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> View on Explorer
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 btn-primary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh Balances
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-6">
          <Card className="shadow-md border-0">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-teal-900 font-display">Transaction Activity</h2>
              <p className="text-sm text-neutral-500">All your wallet transactions</p>
            </div>
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 animate-pulse border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 mr-4"></div>
                          <div>
                            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 w-32 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 rounded-full ${
                            activity.type === "payment_sent" ? "bg-green-50 text-green-600" : "bg-teal-50 text-teal-600"
                          } flex items-center justify-center mr-4`}
                        >
                          {activity.type === "payment_sent" ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-teal-900">{activity.title}</p>
                          <p className="text-xs text-neutral-500">
                            {activity.description.split(" to ")[1] || activity.description.split(" from ")[1]}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-teal-900">
                          {activity.type === "payment_sent" ? "-" : "+"}
                          {activity.description.split(" ")[2]} {activity.description.split(" ")[3]}
                        </p>
                        <p className="text-xs text-neutral-500">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-teal-100 p-3 mb-4">
                    <WalletIcon className="h-6 w-6 text-teal-900" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-teal-900 font-display">No transactions yet</h3>
                  <p className="text-neutral-500 max-w-md mb-6">
                    Your transaction history will appear here once you start using your wallet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
