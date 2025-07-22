"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import TransactionCard from "@/components/dashboard/transaction-card"
import DashboardStats from "@/components/dashboard/stats"
import RecentActivity from "@/components/dashboard/recent-activity"
import UpcomingDeadlines from "@/components/dashboard/upcoming-deadlines"
import MarketOverview from "@/components/dashboard/market-overview"
import { useDatabaseStore } from "@/lib/mock-database"
import { useState, useEffect } from "react"
import { Building, BarChart, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, ResponsiveGrid } from "@/components/ui/responsive-container"
import { Skeleton } from "@/components/ui/design-system"
import ErrorBoundary from "@/components/ui/error-boundary"
import { RetryWrapper } from "@/components/ui/retry-wrapper"
import { useAuth } from "@/context/auth-context-v2"

export default function DashboardPage() {
  const { getTransactions } = useDatabaseStore()
  const [transactions, setTransactions] = useState<any[]>([])
  const [completedTransactions, setCompletedTransactions] = useState<any[]>([])
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [transactionsTab, setTransactionsTab] = useState("active")
  const { isDemoAccount } = useAuth() // Get the demo account status

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      const allTx = getTransactions()
      setAllTransactions(allTx)
      setTransactions(allTx.filter((t) => t.status !== "completed").slice(0, 2))
      setCompletedTransactions(allTx.filter((t) => t.status === "completed").slice(0, 2))
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [getTransactions])

  // Function to render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <>
            <ErrorBoundary level="section">
              <DashboardStats />
            </ErrorBoundary>
            
            <ResponsiveGrid cols={3} gap="lg">
              <div className="lg:col-span-2 space-y-6">
                <ErrorBoundary level="section">
                  <Card className="shadow-soft">
                    <CardHeader className="pb-0">
                      <div className="border-b border-gray-200">
                        <nav className="flex space-x-6">
                          <button
                            className={`nav-link border-b-2 py-3 px-1 ${
                              transactionsTab === "active"
                                ? "border-teal-900 text-teal-900"
                                : "border-transparent"
                            }`}
                            onClick={() => setTransactionsTab("active")}
                          >
                            Active Transactions
                          </button>
                          <button
                            className={`nav-link border-b-2 py-3 px-1 ${
                              transactionsTab === "completed"
                                ? "border-teal-900 text-teal-900"
                                : "border-transparent"
                            }`}
                            onClick={() => setTransactionsTab("completed")}
                          >
                            Completed
                          </button>
                          <button
                            className={`nav-link border-b-2 py-3 px-1 ${
                              transactionsTab === "all"
                                ? "border-teal-900 text-teal-900"
                                : "border-transparent"
                            }`}
                            onClick={() => setTransactionsTab("all")}
                          >
                            All Transactions
                          </button>
                        </nav>
                      </div>
                    </CardHeader>
                    <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2].map((i) => (
                          <Skeleton.Card key={i} />
                        ))}
                      </div>
                    ) : (
                      <>
                        {transactionsTab === "active" && (
                          <>
                            {transactions.length > 0 ? (
                              <div className="space-y-4">
                                {transactions.map((transaction) => (
                                  <TransactionCard key={transaction.id} transaction={transaction} />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="rounded-full bg-teal-100 p-3 mb-4">
                                  <Building className="h-6 w-6 text-teal-900" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-teal-900 font-display">
                                  No active transactions
                                </h3>
                                <p className="text-gray-600 max-w-md mb-6">
                                  {isDemoAccount
                                    ? "You don't have any active real estate transactions. Start a new transaction to begin the escrow process."
                                    : "Welcome to CryptoEscrow! Start your first transaction to begin the escrow process."}
                                </p>
                                <Button asChild>
                                  <Link href="/transactions/new" className="flex items-center">
                                    <Plus className="mr-2 h-4 w-4" /> New Transaction
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </>
                        )}

                        {transactionsTab === "completed" && (
                          <>
                            {completedTransactions.length > 0 ? (
                              <div className="space-y-4">
                                {completedTransactions.map((transaction) => (
                                  <TransactionCard key={transaction.id} transaction={transaction} />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="rounded-full bg-green-100 p-3 mb-4">
                                  <FileText className="h-6 w-6 text-green-700" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-teal-900 font-display">
                                  No completed transactions
                                </h3>
                                <p className="text-gray-600 max-w-md mb-6">
                                  {isDemoAccount
                                    ? "You don't have any completed real estate transactions yet."
                                    : "Your completed transactions will appear here once you've finished your first escrow process."}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {transactionsTab === "all" && (
                          <>
                            {allTransactions.length > 0 ? (
                              <div className="space-y-4">
                                {allTransactions.slice(0, 3).map((transaction) => (
                                  <TransactionCard key={transaction.id} transaction={transaction} />
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-center">
                                <div className="rounded-full bg-teal-100 p-3 mb-4">
                                  <Building className="h-6 w-6 text-teal-900" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-teal-900 font-display">
                                  No transactions found
                                </h3>
                                <p className="text-gray-600 max-w-md mb-6">
                                  {isDemoAccount
                                    ? "Start your first transaction to begin the escrow process."
                                    : "Welcome to CryptoEscrow! Create your first transaction to get started."}
                                </p>
                                <Button asChild>
                                  <Link href="/transactions/new" className="flex items-center">
                                    <Plus className="mr-2 h-4 w-4" /> New Transaction
                                  </Link>
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
                </ErrorBoundary>

                <ErrorBoundary level="component">
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="text-teal-900">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RecentActivity />
                    </CardContent>
                  </Card>
                </ErrorBoundary>
              </div>

              <div className="space-y-6">
                <ErrorBoundary level="component">
                  <Card className="bg-teal-900 text-white shadow-lg border-0">
                    <CardHeader className="border-b border-teal-800">
                      <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <UpcomingDeadlines />
                    </CardContent>
                  </Card>
                </ErrorBoundary>

                <ErrorBoundary level="component">
                  <Card className="shadow-soft">
                    <CardHeader>
                      <CardTitle className="text-teal-900">Market Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MarketOverview />
                    </CardContent>
                  </Card>
                </ErrorBoundary>
              </div>
            </ResponsiveGrid>
          </>
        )
      case "analytics":
        return (
          <div className="space-y-8">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-teal-900">Transaction Analytics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-teal-100 p-3 mb-4">
                  <BarChart className="h-6 w-6 text-teal-900" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-teal-900 font-display">Analytics Dashboard</h3>
                <p className="text-gray-600 max-w-md mb-6">
                  Track your transaction metrics, performance, and trends over time.
                </p>
                <div className="w-full max-w-3xl h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Analytics charts will appear here as you complete transactions</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      case "reports":
        return (
          <div className="space-y-8">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-teal-900">Transaction Reports</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-teal-100 p-3 mb-4">
                  <FileText className="h-6 w-6 text-teal-900" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-teal-900 font-display">Reports Dashboard</h3>
                <p className="text-gray-600 max-w-md mb-6">
                  Generate and download reports for your transactions and financial activity.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                  <Button variant="secondary" className="h-16 justify-start px-4">
                    <FileText className="mr-2 h-5 w-5 text-teal-900" />
                    <div className="text-left">
                      <p className="font-medium">Transaction Summary</p>
                      <p className="text-xs text-gray-500">Last 30 days</p>
                    </div>
                  </Button>
                  <Button variant="secondary" className="h-16 justify-start px-4">
                    <FileText className="mr-2 h-5 w-5 text-teal-900" />
                    <div className="text-left">
                      <p className="font-medium">Financial Report</p>
                      <p className="text-xs text-gray-500">Year to date</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <ResponsiveContainer>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-display text-3xl md:text-4xl font-bold text-teal-900 tracking-tight">ClearHold Dashboard</h1>
            <p className="text-body text-gray-600 mt-2">Manage your real estate transactions securely with blockchain technology</p>
          </div>
          <Link href="/transactions/new">
            <Button size="lg" className="shadow-md">
              <Plus className="mr-2 h-5 w-5" />
              New Transaction
            </Button>
          </Link>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Dashboard tabs">
            <button
              className={`nav-link border-b-2 py-4 px-1 ${
                activeTab === "overview"
                  ? "nav-link-active border-teal-900 text-teal-900"
                  : "border-transparent"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`nav-link border-b-2 py-4 px-1 ${
                activeTab === "analytics"
                  ? "nav-link-active border-teal-900 text-teal-900"
                  : "border-transparent"
              }`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
            <button
              className={`nav-link border-b-2 py-4 px-1 ${
                activeTab === "reports"
                  ? "nav-link-active border-teal-900 text-teal-900"
                  : "border-transparent"
              }`}
              onClick={() => setActiveTab("reports")}
            >
              Reports
            </button>
          </nav>
        </div>
      </div>

      {renderTabContent()}
    </ResponsiveContainer>
  )
}
