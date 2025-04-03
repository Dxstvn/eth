import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import TransactionCard from "@/components/transaction-card"
import PageTitle from "@/components/page-title"

export default function TransactionsPage() {
  // Sample transaction data
  const transactions = [
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
    {
      id: "TX345678",
      propertyAddress: "789 Ledger Lane, Blockchain Heights",
      amount: "3.2 ETH",
      status: "completed",
      counterparty: "Michael Chen",
      date: "2023-03-28",
      progress: 100,
    },
    {
      id: "TX901234",
      propertyAddress: "321 Crypto Court, DeFi District",
      amount: "75,000 USDC",
      status: "completed",
      counterparty: "Emily Rodriguez",
      date: "2023-03-15",
      progress: 100,
    },
  ]

  return (
    <div className="container px-4 md:px-6">
      <PageTitle
        title="Transactions"
        description="Manage all your real estate escrow transactions"
        actions={
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="mr-2 h-4 w-4" /> New Transaction
            </Link>
          </Button>
        }
      />

      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search transactions..." className="pl-8" />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select defaultValue="all">
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
              <Select defaultValue="newest">
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
              <Button variant="outline" size="icon">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  )
}

