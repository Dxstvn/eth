import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  LockKeyhole,
  UserCheck,
  DollarSign,
  Building,
  Calendar,
  User,
} from "lucide-react"
import Link from "next/link"

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
          label: "Verification",
          color: "bg-blue-50 text-blue-700",
          icon: <UserCheck className="h-4 w-4 mr-1" />,
        }
      case "awaiting_funds":
        return {
          label: "Awaiting Funds",
          color: "bg-yellow-50 text-yellow-700",
          icon: <DollarSign className="h-4 w-4 mr-1" />,
        }
      case "in_escrow":
        return {
          label: "In Escrow",
          color: "bg-purple-50 text-purple-700",
          icon: <LockKeyhole className="h-4 w-4 mr-1" />,
        }
      case "pending_approval":
        return {
          label: "Pending Approval",
          color: "bg-orange-50 text-orange-700",
          icon: <FileText className="h-4 w-4 mr-1" />,
        }
      case "completed":
        return {
          label: "Completed",
          color: "bg-green-50 text-green-700",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
        }
      default:
        return {
          label: "Unknown Status",
          color: "bg-gray-50 text-gray-700",
          icon: <Clock className="h-4 w-4 mr-1" />,
        }
    }
  }

  const statusInfo = getStatusInfo(transaction.status)

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-medium">{transaction.propertyAddress}</h3>
            <Badge className={`${statusInfo.color} border-0`}>
              <div className="flex items-center">
                {statusInfo.icon} {statusInfo.label}
              </div>
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              <span>{transaction.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{transaction.counterparty}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{transaction.date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Amount</p>
            <p className="font-medium">{transaction.amount}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="whitespace-nowrap">
            <Link href={`/transactions/${transaction.id}`} className="flex items-center">
              View Details <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Progress</span>
          <span>{transaction.progress}%</span>
        </div>
        <Progress value={transaction.progress} className="h-1.5" />
      </div>
    </div>
  )
}

