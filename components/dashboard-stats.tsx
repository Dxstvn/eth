import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, Building2, DollarSign, Wallet } from "lucide-react"

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Transactions</p>
              <p className="text-2xl font-bold mt-1">2</p>
            </div>
            <div className="rounded-full bg-teal-100 p-2">
              <Building2 className="h-4 w-4 text-teal-700" />
            </div>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            <span className="text-green-500 font-medium">+1</span>
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value Locked</p>
              <p className="text-2xl font-bold mt-1">$152,500</p>
            </div>
            <div className="rounded-full bg-teal-100 p-2">
              <DollarSign className="h-4 w-4 text-teal-700" />
            </div>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            <span className="text-green-500 font-medium">+12%</span>
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed Transactions</p>
              <p className="text-2xl font-bold mt-1">12</p>
            </div>
            <div className="rounded-full bg-teal-100 p-2">
              <Wallet className="h-4 w-4 text-teal-700" />
            </div>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            <span className="text-green-500 font-medium">+3</span>
            <span className="ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

