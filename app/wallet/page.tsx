import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Copy, ExternalLink, Plus, RefreshCw, Send } from "lucide-react"
import PageTitle from "@/components/page-title"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function WalletPage() {
  return (
    <div className="container px-4 md:px-6">
      <PageTitle
        title="Wallet"
        description="Manage your cryptocurrency wallet and transactions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button>
              <Send className="mr-2 h-4 w-4" /> Send
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-teal-700 to-teal-900 text-white">
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div>
                    <p className="text-sm text-teal-100">Total Balance</p>
                    <p className="text-3xl font-bold mt-1">$155,750</p>
                  </div>
                  <div className="mt-6 flex justify-between items-center">
                    <p className="text-sm text-teal-100">+12.5% this month</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-teal-100 text-teal-100 hover:bg-teal-800 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Funds
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 font-semibold mr-2">
                      B
                    </div>
                    <p className="text-lg font-medium">Bitcoin</p>
                  </div>
                  <p className="text-3xl font-bold">1.25 BTC</p>
                  <p className="text-gray-500 mb-4">$54,250</p>
                  <p className="text-sm text-green-600 mt-auto">+3.2% today</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold mr-2">
                      E
                    </div>
                    <p className="text-lg font-medium">Ethereum</p>
                  </div>
                  <p className="text-3xl font-bold">32.5 ETH</p>
                  <p className="text-gray-500 mb-4">$101,500</p>
                  <p className="text-sm text-green-600 mt-auto">+1.8% today</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent wallet transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-semibold mr-3">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Sent ETH</p>
                      <p className="text-xs text-muted-foreground">To: 0x1a2b...3c4d</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">-2.5 ETH</p>
                    <p className="text-xs text-muted-foreground">Apr 15, 2023</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold mr-3">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Received BTC</p>
                      <p className="text-xs text-muted-foreground">From: 0x7e8f...9a0b</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">+0.5 BTC</p>
                    <p className="text-xs text-muted-foreground">Apr 10, 2023</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-semibold mr-3">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Sent USDC</p>
                      <p className="text-xs text-muted-foreground">To: 0x4d5e...6f7g</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">-10,000 USDC</p>
                    <p className="text-xs text-muted-foreground">Apr 5, 2023</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold mr-3">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">Received ETH</p>
                      <p className="text-xs text-muted-foreground">From: 0xb1c2...d3e4</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">+5.0 ETH</p>
                    <p className="text-xs text-muted-foreground">Apr 1, 2023</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Wallet Address</CardTitle>
              <CardDescription>Your public wallet address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <code className="bg-gray-100 p-2 rounded text-sm flex-1 overflow-x-auto">
                  0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
                </code>
                <Button variant="ghost" size="icon" className="ml-2">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" /> View on Blockchain Explorer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Quick Send</CardTitle>
              <CardDescription>Send cryptocurrency to another wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input id="recipient" placeholder="Enter wallet address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select id="currency" className="w-full p-2 border rounded-md">
                    <option value="eth">ETH</option>
                    <option value="btc">BTC</option>
                    <option value="usdc">USDC</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
              </div>

              <Button className="w-full">
                <Send className="mr-2 h-4 w-4" /> Send
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Security</CardTitle>
              <CardDescription>Wallet security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Enabled</p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Transaction Limits</p>
                  <p className="text-xs text-muted-foreground">5 ETH per day</p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Backup Recovery Phrase</p>
                  <p className="text-xs text-muted-foreground">Last verified: 30 days ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Verify
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

