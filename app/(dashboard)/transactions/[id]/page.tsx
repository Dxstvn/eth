"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, CheckCircle, Clock, FileText, LockKeyhole, UserCheck, DollarSign } from "lucide-react"
import Link from "next/link"
import TransactionTimeline from "@/components/transaction-timeline"
import TransactionParties from "@/components/transaction-parties"
import { useDatabaseStore } from "@/lib/mock-database"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import TransactionStageIndicator from "@/components/transaction-stage-indicator"

export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  const { getTransactions } = useDatabaseStore()
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Simulate loading
    const loadingTimer = setTimeout(() => {
      const transactions = getTransactions()
      const foundTransaction = transactions.find((t) => t.id === params.id)

      if (foundTransaction) {
        setTransaction(foundTransaction)
      } else {
        // If transaction not found, redirect to transactions list
        router.push("/transactions")
      }

      setLoading(false)
    }, 1000)

    return () => clearTimeout(loadingTimer)
  }, [params.id, getTransactions, router])

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "verification":
        return {
          label: "Verification",
          color: "bg-blue-50 text-blue-700",
          icon: <UserCheck className="h-5 w-5 mr-2" />,
        }
      case "awaiting_funds":
        return {
          label: "Awaiting Funds",
          color: "bg-amber-50 text-amber-700",
          icon: <DollarSign className="h-5 w-5 mr-2" />,
        }
      case "in_escrow":
        return {
          label: "In Escrow",
          color: "bg-purple-50 text-purple-700",
          icon: <LockKeyhole className="h-5 w-5 mr-2" />,
        }
      case "pending_approval":
        return {
          label: "Pending Approval",
          color: "bg-orange-50 text-orange-700",
          icon: <FileText className="h-5 w-5 mr-2" />,
        }
      case "completed":
        return {
          label: "Completed",
          color: "bg-green-50 text-green-700",
          icon: <CheckCircle className="h-5 w-5 mr-2" />,
        }
      default:
        return {
          label: "Unknown Status",
          color: "bg-gray-50 text-gray-700",
          icon: <Clock className="h-5 w-5 mr-2" />,
        }
    }
  }

  if (loading) {
    return (
      <div className="container px-4 md:px-6">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/transactions">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to Transactions</span>
              </Link>
            </Button>
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
                    <div className="h-12 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="pt-4">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-8">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="relative pl-10">
                        <div className="absolute left-0 h-8 w-8 bg-gray-200 rounded-full"></div>
                        <div className="h-5 bg-gray-200 rounded w-1/2 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-1/2 mb-1 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return null // This should not happen as we redirect if transaction not found
  }

  const statusInfo = getStatusInfo(transaction.status)

  return (
    <div className="container px-4 md:px-6">
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/transactions">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Transactions</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-brand-900">Transaction Details</h1>
            <p className="text-neutral-600">View and manage transaction {transaction.id}</p>
          </div>
        </div>
        <TransactionStageIndicator stage={transaction.status} size="lg" className="self-start" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-soft border-0">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-brand-900">{transaction.propertyAddress}</h2>
                  <p className="text-neutral-600 mt-1">
                    {transaction.description || "Purchase of property using cryptocurrency with escrow services."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
                  <div>
                    <p className="text-sm text-neutral-500">Transaction Amount</p>
                    <p className="text-2xl font-bold text-brand-900">{transaction.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Transaction Date</p>
                    <p className="font-medium text-brand-900">{transaction.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Transaction ID</p>
                    <p className="font-medium text-brand-900">{transaction.id}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-neutral-500">Progress</span>
                    <span className="text-brand-700 font-medium">{transaction.progress}%</span>
                  </div>
                  <Progress value={transaction.progress} className="h-2 bg-neutral-100">
                    <div
                      className={`h-full ${
                        transaction.status === "completed"
                          ? "bg-green-500"
                          : "bg-gradient-to-r from-brand-500 to-brand-600"
                      }`}
                      style={{ width: `${transaction.progress}%` }}
                    />
                  </Progress>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="timeline">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4">
              <Card className="shadow-soft border-0">
                <CardContent className="p-6">
                  <TransactionTimeline />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <Card className="shadow-soft border-0">
                <CardContent className="p-6">
                  <p className="text-neutral-500">No documents have been uploaded yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="messages" className="mt-4">
              <Card className="shadow-soft border-0">
                <CardContent className="p-6">
                  <p className="text-neutral-500">No messages in this transaction yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="shadow-soft border-0">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-brand-900">Transaction Parties</h3>
              <TransactionParties />
            </CardContent>
          </Card>

          <Card className="shadow-soft border-0">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-brand-900">Actions</h3>
              <div className="space-y-3">
                <Button className="w-full bg-brand-600 hover:bg-brand-700">Release Funds</Button>
                <Button
                  variant="outline"
                  className="w-full text-brand-700 hover:bg-brand-50 hover:text-brand-800 border-brand-200"
                >
                  Request Extension
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-brand-700 hover:bg-brand-50 hover:text-brand-800 border-brand-200"
                >
                  Cancel Transaction
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
