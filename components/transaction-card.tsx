import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle, Clock, FileText, LockKeyhole, UserCheck, DollarSign } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

interface Transaction {
  id: string
  propertyAddress: string
  amount: string
  status: string
  counterparty: string
  date: string
  progress: number
}

interface TransactionCardProps {
  transaction: Transaction
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "verification":
        return {
          label: "Verification in Progress",
          color: "bg-yellow-100 text-yellow-800",
          icon: <UserCheck className="h-4 w-4 mr-1" />,
        }
      case "awaiting_funds":
        return {
          label: "Awaiting Funds",
          color: "bg-blue-100 text-blue-800",
          icon: <DollarSign className="h-4 w-4 mr-1" />,
        }
      case "in_escrow":
        return {
          label: "In Escrow",
          color: "bg-purple-100 text-purple-800",
          icon: <LockKeyhole className="h-4 w-4 mr-1" />,
        }
      case "pending_approval":
        return {
          label: "Pending Approval",
          color: "bg-orange-100 text-orange-800",
          icon: <FileText className="h-4 w-4 mr-1" />,
        }
      case "completed":
        return {
          label: "Completed",
          color: "bg-green-100 text-green-800",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
        }
      default:
        return {
          label: "Unknown Status",
          color: "bg-gray-100 text-gray-800",
          icon: <Clock className="h-4 w-4 mr-1" />,
        }
    }
  }

  const statusInfo = getStatusInfo(transaction.status)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <div>
            <CardTitle className="text-lg">{transaction.propertyAddress}</CardTitle>
            <CardDescription>
              ID: {transaction.id} • Created: {new Date(transaction.date).toLocaleDateString()}
            </CardDescription>
          </div>
          <Badge className={`${statusInfo.color} flex items-center self-start`}>
            {statusInfo.icon} {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="font-semibold">{transaction.amount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Counterparty</p>
            <p className="font-semibold">{transaction.counterparty}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={transaction.progress} className="h-2 flex-1" />
              <span className="text-sm font-medium">{transaction.progress}%</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/transactions/${transaction.id}`}>
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

