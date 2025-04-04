import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, CheckCircle, Clock, FileText, LockKeyhole, UserCheck, DollarSign } from "lucide-react"
import Link from "next/link"
import TransactionTimeline from "@/components/transaction-timeline"
import TransactionParties from "@/components/transaction-parties"

export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  // This would normally come from an API or database
  const transaction = {
    id: params.id,
    propertyAddress: "123 Blockchain Ave, Crypto City",
    amount: "2.5 ETH",
    status: "verification",
    counterparty: "John Smith",
    date: "2023-04-15",
    progress: 40,
    description:
      "Purchase of residential property using cryptocurrency with escrow services to ensure secure transaction between buyer and seller.",
  }

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
          color: "bg-yellow-50 text-yellow-700",
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
            <h1 className="text-2xl font-bold">Transaction Details</h1>
            <p className="text-gray-500">View and manage transaction {transaction.id}</p>
          </div>
        </div>
        <Badge className={`${statusInfo.color} text-sm py-1 px-3`}>
          <div className="flex items-center">
            {statusInfo.icon}
            {statusInfo.label}
          </div>
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{transaction.propertyAddress}</h2>
                  <p className="text-gray-500 mt-1">{transaction.description}</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
                  <div>
                    <p className="text-sm text-gray-500">Transaction Amount</p>
                    <p className="text-2xl font-bold">{transaction.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transaction Date</p>
                    <p className="font-medium">{transaction.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Transaction ID</p>
                    <p className="font-medium">{transaction.id}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span>{transaction.progress}%</span>
                  </div>
                  <Progress value={transaction.progress} className="h-2" />
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
              <Card>
                <CardContent className="p-6">
                  <TransactionTimeline />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500">No documents have been uploaded yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="messages" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-gray-500">No messages in this transaction yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Parties</h3>
              <TransactionParties />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Actions</h3>
              <div className="space-y-3">
                <Button className="w-full">Release Funds</Button>
                <Button variant="outline" className="w-full">
                  Request Extension
                </Button>
                <Button variant="outline" className="w-full">
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

