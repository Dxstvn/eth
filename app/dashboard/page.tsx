import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Building, FileCheck, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import TransactionCard from "@/components/transaction-card"
import DashboardStats from "@/components/dashboard-stats"
import PageTitle from "@/components/page-title"
import RecentActivity from "@/components/recent-activity"
import UpcomingDeadlines from "@/components/upcoming-deadlines"

export default function DashboardPage() {
  // Sample transaction data
  const activeTransactions = [
    {
      id: "TX123456",
      propertyAddress: "123 Blockchain Ave, Crypto City",
      amount: "2.5 ETH",
      status: "verification",
      counterparty: "John Smith",
      date: "2023-04-15",
      progress: 40,
    },
    {
      id: "TX789012",
      propertyAddress: "456 Smart Contract St, Token Town",
      amount: "150,000 USDC",
      status: "awaiting_funds",
      counterparty: "Sarah Johnson",
      date: "2023-04-10",
      progress: 20,
    },
  ]

  return (
    <div className="container px-4 md:px-6">
      <PageTitle
        title="Dashboard"
        description="Manage your real estate transactions securely with cryptocurrency"
        actions={
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        }
      />

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Transactions</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-4">
              {activeTransactions.length > 0 ? (
                activeTransactions.map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <div className="rounded-full bg-teal-100 p-3 mb-4">
                      <Building className="h-6 w-6 text-teal-700" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No active transactions</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      You don't have any active real estate transactions. Start a new transaction to begin the escrow
                      process.
                    </p>
                    <Button asChild>
                      <Link href="/transactions/new">
                        <Plus className="mr-2 h-4 w-4" /> New Transaction
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <div className="rounded-full bg-teal-100 p-3 mb-4">
                    <FileCheck className="h-6 w-6 text-teal-700" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No completed transactions</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    You don't have any completed real estate transactions yet.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="space-y-4 mt-4">
              {activeTransactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates on your transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity />
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/activity">
                  View All Activity <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Upcoming Deadlines</CardTitle>
              <CardDescription>Important dates for your transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <UpcomingDeadlines />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Current cryptocurrency rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-800 font-semibold mr-2">
                    B
                  </div>
                  <div>
                    <p className="font-medium">Bitcoin</p>
                    <p className="text-xs text-muted-foreground">BTC</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">$43,256.78</p>
                  <p className="text-xs text-green-600">+2.4%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-semibold mr-2">
                    E
                  </div>
                  <div>
                    <p className="font-medium">Ethereum</p>
                    <p className="text-xs text-muted-foreground">ETH</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">$3,142.55</p>
                  <p className="text-xs text-green-600">+1.8%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-semibold mr-2">
                    U
                  </div>
                  <div>
                    <p className="font-medium">USD Coin</p>
                    <p className="text-xs text-muted-foreground">USDC</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">$1.00</p>
                  <p className="text-xs text-gray-500">0.0%</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Rates
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

