import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Copy, ExternalLink, Plus, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react"

export default function WalletPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-gray-500">Manage your cryptocurrency wallet and transactions</p>
        </div>
        <div>
          <Button variant="outline" className="rounded-full px-6">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Balance Card with Gradient */}
            <Card className="overflow-hidden shadow-sm border-0">
              <div className="bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white">
                <div className="flex flex-col h-full">
                  <div>
                    <p className="text-sm text-teal-100 font-medium">Total Balance</p>
                    <p className="text-4xl font-bold mt-1">$155,750</p>
                  </div>
                  <div className="mt-6 flex justify-between items-center">
                    <p className="text-sm text-teal-100">+12.5% this month</p>
                    <Button className="bg-black hover:bg-gray-800 text-white border-0 rounded-md" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add Funds
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bitcoin Card */}
            <Card className="overflow-hidden shadow-sm hover:shadow transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 font-semibold mr-2">
                      B
                    </div>
                    <p className="text-lg font-medium">Bitcoin</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-3xl font-bold">1.25 BTC</p>
                    <p className="text-gray-500">$54,250</p>
                  </div>
                  <p className="text-sm text-green-600 mt-4">+3.2% today</p>
                </div>
              </CardContent>
            </Card>

            {/* Ethereum Card */}
            <Card className="overflow-hidden shadow-sm hover:shadow transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold mr-2">
                      E
                    </div>
                    <p className="text-lg font-medium">Ethereum</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-3xl font-bold">32.5 ETH</p>
                    <p className="text-gray-500">$101,500</p>
                  </div>
                  <p className="text-sm text-green-600 mt-4">+1.8% today</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card className="shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <p className="text-sm text-gray-500">Recent wallet transactions</p>
            </div>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 mr-4">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Sent ETH</p>
                      <p className="text-xs text-gray-500">To: 0x1a2b...3c4d</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">-2.5 ETH</p>
                    <p className="text-xs text-gray-500">Apr 15, 2023</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
                      <ArrowDownRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Received BTC</p>
                      <p className="text-xs text-gray-500">From: 0x7e8f...9a0b</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">+0.5 BTC</p>
                    <p className="text-xs text-gray-500">Apr 10, 2023</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 mr-4">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Sent USDC</p>
                      <p className="text-xs text-gray-500">To: 0x4d5e...6f7g</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">-10,000 USDC</p>
                    <p className="text-xs text-gray-500">Apr 5, 2023</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
                      <ArrowDownRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Received ETH</p>
                      <p className="text-xs text-gray-500">From: 0xb1c2...d3e4</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">+5.0 ETH</p>
                    <p className="text-xs text-gray-500">Apr 1, 2023</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t">
                <Button variant="outline" className="w-full">
                  View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Wallet Address Card */}
          <Card className="shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Wallet Address</h2>
              <p className="text-sm text-gray-500">Your public wallet address</p>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                <code className="text-sm flex-1 overflow-x-auto font-mono">
                  0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
                </code>
                <Button variant="ghost" size="icon" className="ml-2 text-gray-500 hover:text-gray-700">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full flex items-center justify-center">
                <ExternalLink className="mr-2 h-4 w-4" /> View on Blockchain Explorer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

