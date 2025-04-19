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
import type { Transaction } from "@/lib/mock-database"

interface TransactionCardProps {
  transaction: Transaction
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "verification":
        return {
          label: "Verification",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <UserCheck className="h-4 w-4 mr-1" />,
        }
      case "awaiting_funds":
        return {
          label: "Awaiting Funds",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <DollarSign className="h-4 w-4 mr-1" />,
        }
      case "in_escrow":
        return {
          label: "In Escrow",
          color: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <LockKeyhole className="h-4 w-4 mr-1" />,
        }
      case "pending_approval":
        return {
          label: "Pending Approval",
          color: "bg-orange-50 text-orange-700 border-orange-200",
          icon: <FileText className="h-4 w-4 mr-1" />,
        }
      case "completed":
        return {
          label: "Completed",
          color: "bg-green-50 text-green-700 border-green-200",
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
        }
      default:
        return {
          label: "Unknown Status",
          color: "bg-gray-50 text-gray-700 border-gray-200",
          icon: <Clock className="h-4 w-4 mr-1" />,
        }
    }
  }

  const statusInfo = getStatusInfo(transaction.status)

  // Extract currency from amount (e.g., "2.5 ETH" -> "ETH")
  const currency = transaction.amount.split(" ").length > 1 ? transaction.amount.split(" ")[1] : ""

  return (
    <div className="glass-card p-5 rounded-xl hover:shadow-md transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-medium text-brand-900 font-display">{transaction.propertyAddress}</h3>
            <Badge className={`${statusInfo.color} border`}>
              <div className="flex items-center">
                {statusInfo.icon} {statusInfo.label}
              </div>
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
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
              <span>{new Date(transaction.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-neutral-500">Amount</p>
            <p className="font-medium text-brand-900">{transaction.amount}</p>
          </div>
          <Button asChild variant="secondary" size="sm" className="whitespace-nowrap">
            <Link href={`/transactions/${transaction.id}`} className="flex items-center">
              View Details <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Progress</span>
          <span className="text-brand-700 font-medium">{transaction.progress}%</span>
        </div>
        <Progress value={transaction.progress} className="h-1.5 bg-neutral-100">
          <div
            className={`h-full ${
              transaction.status === "completed" ? "bg-green-500" : "bg-gradient-to-r from-brand-500 to-brand-600"
            }`}
            style={{ width: `${transaction.progress}%` }}
          />
        </Progress>
      </div>
    </div>
  )
}
