"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import TransactionCard from "@/components/transaction-card"
import PageTitle from "@/components/page-title"
import { useDatabaseStore } from "@/lib/mock-database"
import { useState, useEffect } from "react"

export default function TransactionsPage() {
  const { getTransactions } = useDatabaseStore()
  const [transactions, setTransactions] = useState(getTransactions())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((transaction) => {
      const matchesSearch =
        transaction.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.counterparty.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const getTime = (date: string) => new Date(date).getTime()

      switch (sortOrder) {
        case "newest":
          return getTime(b.date) - getTime(a.date)
        case "oldest":
          return getTime(a.date) - getTime(b.date)
        case "amount_high":
          return Number.parseFloat(b.amount) - Number.parseFloat(a.amount)
        case "amount_low":
          return Number.parseFloat(a.amount) - Number.parseFloat(b.amount)
        default:
          return 0
      }
    })

  return (
    <div className="container px-4 md:px-6">
      <PageTitle
        title="Transactions"
        description="Manage all your real estate escrow transactions"
        actions={
          <Button asChild className="bg-teal-900 hover:text-gold-300 text-white">
            <Link href="/transactions/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        }
      />

      <Card className="mb-8 shadow-soft border-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search transactions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verification">Verification</SelectItem>
                  <SelectItem value="awaiting_funds">Awaiting Funds</SelectItem>
                  <SelectItem value="in_escrow">In Escrow</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount_high">Amount (High to Low)</SelectItem>
                  <SelectItem value="amount_low">Amount (Low to High)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="text-brand-700 hover:bg-brand-50 hover:text-brand-800 border-brand-200"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading ? (
          // Loading skeleton
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} />)
        ) : (
          <div className="text-center py-12 bg-neutral-50 rounded-lg">
            <h3 className="text-lg font-medium text-brand-900 mb-1">No transactions found</h3>
            <p className="text-neutral-500">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first transaction to get started"}
            </p>
            <Button asChild className="mt-4 bg-teal-900 hover:text-gold-300 text-white">
              <Link href="/transactions/new">
                <Plus className="mr-2 h-4 w-4" /> New Transaction
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
