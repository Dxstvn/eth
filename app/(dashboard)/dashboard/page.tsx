import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import TransactionCard from "@/components/dashboard/transaction-card"
import DashboardStats from "@/components/dashboard/stats"
import RecentActivity from "@/components/dashboard/recent-activity"
import UpcomingDeadlines from "@/components/dashboard/upcoming-deadlines"
import MarketOverview from "@/components/dashboard/market-overview"

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
    <div className="pl-6 space-y-8">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Manage your real estate transactions securely with cryptocurrency</p>
          </div>
          <Button asChild className="bg-black hover:bg-gray-800 text-white">
            <Link href="/transactions/new" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Dashboard tabs">
            <button className="border-b-2 border-black py-4 px-1 text-sm font-medium text-gray-900">Overview</button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
              Analytics
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700">
              Reports
            </button>
          </nav>
        </div>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg">
            <div className="border-b border-gray-100">
              <div className="flex">
                <button className="px-4 py-3 text-sm font-medium border-b-2 border-black">Active Transactions</button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700">
                  Completed
                </button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700">
                  All Transactions
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activeTransactions.map((transaction) => (
                  <TransactionCard key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-medium">Recent Activity</h2>
            </div>
            <div className="p-6">
              <RecentActivity />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-medium">Upcoming Deadlines</h2>
            </div>
            <div className="p-6">
              <UpcomingDeadlines />
            </div>
          </div>

          <div className="bg-white rounded-lg">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-medium">Market Overview</h2>
            </div>
            <div className="p-6">
              <MarketOverview />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

